import type { ResponseItem } from "../model/ResponseItem.js";
import type { ResponseAnswer } from "../model/ResponseAnswer.js";
import type { AnswerOption } from "../model/AnswerOption.js";
import type { AnswerValue, ValidationError } from "../model/types.js";
import { useQuestionnaireResponse } from "./context.js";
import { useSignalValue } from "./use-signal-value.js";

/**
 * Look up a response item by linkId.
 * Returns the first instance (use the model directly for repeating items).
 */
export function useResponseItem(linkId: string): ResponseItem | undefined {
  const model = useQuestionnaireResponse();
  return useSignalValue(() => model.getItems(linkId)[0]);
}

/**
 * Look up a response item by its unique instance ID.
 */
export function useResponseItemById(id: string): ResponseItem | undefined {
  const model = useQuestionnaireResponse();
  return useSignalValue(() => model.getItemById(id));
}

/**
 * Subscribe to an item's enabled state.
 */
export function useEnabled(item: ResponseItem): boolean {
  return useSignalValue(() => item.enabled);
}

/**
 * Subscribe to an item's visibility (enabled OR disabledDisplay !== "hidden").
 */
export function useVisible(item: ResponseItem): boolean {
  return useSignalValue(() => item.visible);
}

/**
 * Subscribe to an item's answer values.
 */
export function useAnswerValues(item: ResponseItem): AnswerValue[] | null {
  return useSignalValue(() => item.answerValues);
}

/**
 * Subscribe to an item's answer entries (for items with answer[].item[] pattern).
 */
export function useAnswerEntries(item: ResponseItem): ResponseAnswer[] {
  return useSignalValue(() => item.answerEntries);
}

/**
 * Subscribe to an item's enabled answer options (filtered by toggle expressions).
 */
export function useAnswerOptions(item: ResponseItem): AnswerOption[] {
  return useSignalValue(() => item.enabledAnswerOptions);
}

/**
 * Subscribe to an item's validation state.
 */
export function useValidation(item: ResponseItem): {
  valid: boolean;
  errors: readonly ValidationError[];
} {
  return useSignalValue(() => ({
    valid: item.valid,
    errors: item.errors,
  }));
}

/**
 * Subscribe to an item's visible children.
 */
export function useVisibleChildren(item: ResponseItem): ResponseItem[] {
  return useSignalValue(() => item.visibleItems);
}

/**
 * Subscribe to a response answer entry's visible children.
 */
export function useVisibleAnswerChildren(
  entry: ResponseAnswer,
): ResponseItem[] {
  return useSignalValue(() => entry.visibleItems);
}

/**
 * Subscribe to an item's dirty state.
 */
export function useDirty(item: ResponseItem): boolean {
  return useSignalValue(() => item.dirty);
}

/**
 * Subscribe to an item's touched state.
 */
export function useTouched(item: ResponseItem): boolean {
  return useSignalValue(() => item.touched);
}
