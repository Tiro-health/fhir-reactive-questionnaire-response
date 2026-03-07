import type {
  AnswerValue,
  QuestionnaireResponse,
  QuestionnaireResponseAnswer,
  QuestionnaireResponseItem,
} from "./types.js";
import type { ResponseItem } from "./ResponseItem.js";
import type { QuestionnaireResponseModel } from "./QuestionnaireResponse.js";
import { answerValuesMatch } from "../build/extensions.js";

/**
 * A function that decides how to combine existing and incoming answer values.
 */
export type MergeStrategy = (
  existing: AnswerValue[],
  incoming: AnswerValue[],
) => AnswerValue[];

/** Replace existing answers with incoming. */
export const overwrite: MergeStrategy = (_existing, incoming) => incoming;

/** Only apply incoming if there are no existing answers. */
export const keepExisting: MergeStrategy = (existing, incoming) =>
  existing.length > 0 ? existing : incoming;

/** Concatenate existing answers with incoming. */
export const append: MergeStrategy = (existing, incoming) => [
  ...existing,
  ...incoming,
];

/**
 * Walk a partial QuestionnaireResponse and merge its answers into a reactive model.
 *
 * - Non-repeating items: apply the strategy to merge answers.
 * - Repeating groups: each partial instance is appended via `parent.addItem`.
 * - Calculated items: throws if the partial provides an answer.
 * - Items not in the partial: left untouched.
 */
export function mergeResponse(
  root: QuestionnaireResponseModel,
  partial: QuestionnaireResponse,
  strategy: MergeStrategy = overwrite,
): void {
  if (partial.item) {
    mergeItems(root, root.items, partial.item, root, strategy);
  }
}

/**
 * Recursively merge partial items into matching existing items.
 *
 * @param parent - The parent node, used for `addItem` on repeating groups.
 * @param existingItems - The items to search within (may differ from `parent.items`
 *   when recursing into answer entry children).
 * @param partialItems - The partial QR items to merge in.
 * @param root - The root model.
 * @param strategy - The merge strategy.
 */
function mergeItems(
  parent: ResponseItem | QuestionnaireResponseModel,
  existingItems: ResponseItem[],
  partialItems: QuestionnaireResponseItem[],
  root: QuestionnaireResponseModel,
  strategy: MergeStrategy,
): void {
  for (const partialItem of partialItems) {
    const definition = root.definitions.get(partialItem.linkId);
    if (!definition) {
      throw new Error(
        `No questionnaire definition found for linkId "${partialItem.linkId}"`,
      );
    }

    // Repeating groups: append each partial instance
    if (definition.type === "group" && definition.repeats) {
      parent.addItem(partialItem.linkId, partialItem);
      continue;
    }

    // Find first matching item by linkId among the items in scope
    const existing = existingItems.find(
      (i) => i.linkId === partialItem.linkId,
    );
    if (!existing) {
      throw new Error(
        `No item found for linkId "${partialItem.linkId}" in current context`,
      );
    }

    // Calculated items: throw if partial provides an answer
    if (
      existing.calculatedExpression &&
      partialItem.answer &&
      partialItem.answer.length > 0
    ) {
      throw new Error(
        `Cannot merge answer into calculated item "${partialItem.linkId}"`,
      );
    }

    // Merge answer values
    if (
      partialItem.answer &&
      partialItem.answer.length > 0 &&
      !existing.calculatedExpression
    ) {
      const incoming: AnswerValue[] = partialItem.answer.map(stripNestedItems);
      const existingAnswers = existing.answerValues ?? [];
      const result = strategy(existingAnswers, incoming);

      if (existing.hasAnswerItems) {
        // AnswerEntryResponseItem: update existing entries, add new ones
        const currentEntries = existing.answerEntries;
        for (let i = 0; i < result.length; i++) {
          if (i < currentEntries.length) {
            currentEntries[i].setValue(result[i]);
          } else {
            existing.addAnswer(result[i]);
          }
        }

        // Recurse into answer[].item[] children from the partial.
        // Match each partial answer to the corresponding model entry by value.
        const usedEntryIndices = new Set<number>();
        for (const partialAnswer of partialItem.answer) {
          if (partialAnswer.item && partialAnswer.item.length > 0) {
            const entryValue = stripNestedItems(partialAnswer);
            const entryIdx = existing.answerEntries.findIndex(
              (e, idx) =>
                !usedEntryIndices.has(idx) &&
                answerValuesMatch(e.value, entryValue),
            );
            if (entryIdx !== -1) {
              usedEntryIndices.add(entryIdx);
              const entry = existing.answerEntries[entryIdx];
              mergeItems(existing, entry.items, partialAnswer.item, root, strategy);
            }
          }
        }
      } else {
        existing.setAnswer(result);
      }
    }

    // Recurse into group children (item.item[])
    if (partialItem.item && partialItem.item.length > 0) {
      mergeItems(existing, existing.items, partialItem.item, root, strategy);
    }
  }
}

/** Extract just the value fields from an answer, stripping nested items. */
function stripNestedItems(answer: QuestionnaireResponseAnswer): AnswerValue {
  const { item: _item, ...value } = answer;
  return value;
}
