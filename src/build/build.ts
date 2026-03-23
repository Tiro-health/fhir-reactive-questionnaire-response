import { Signal } from "@lit-labs/signals";
import {
  ANSWER_VALUE_KEYS,
  type AnswerValue,
  type Questionnaire,
  type QuestionnaireItem,
  type QuestionnaireItemType,
  type QuestionnaireResponse,
  type QuestionnaireResponseItem,
} from "../model/types.js";
import { QuestionnaireResponseModel } from "../model/QuestionnaireResponse.js";
import type {
  EnabledResolver,
  ResponseItem,
  ResponseNode,
} from "../model/ResponseItem.js";
import { FlatResponseItem } from "../model/FlatResponseItem.js";
import { AnswerEntryResponseItem } from "../model/AnswerEntryResponseItem.js";
import { ResponseAnswer } from "../model/ResponseAnswer.js";
import { AnswerOption } from "../model/AnswerOption.js";
import {
  getCalculatedExpression,
  getEnableWhenExpression,
  getAnswerOptionsToggleExpressions,
  answerValuesMatch,
} from "./extensions.js";
import { evaluateFhirPath } from "./fhirpath-context.js";
import { evaluateEnableWhen } from "./enable-when.js";

/** Shared signal for items that are unconditionally enabled. */
const ALWAYS_TRUE = new Signal.Computed<boolean>(() => true);

export function buildQuestionnaireResponse(
  questionnaire: Questionnaire,
  response?: QuestionnaireResponse,
): QuestionnaireResponseModel {
  const root = new QuestionnaireResponseModel({
    id: response?.id,
    status: response?.status ?? "in-progress",
    questionnaire: response?.questionnaire ?? questionnaire.id,
    items: [], // populated below via signal set
  });

  // Index all questionnaire item definitions by linkId
  indexDefinitions(questionnaire.item ?? [], root.definitions);

  const items = hydrateChildren(
    questionnaire.item ?? [],
    response?.item ?? [],
    root,
    root,
  );

  // Populate root.items via signal
  root._itemsSignal.set(items);

  // Attach the buildItem factory for runtime instance creation
  root._buildItem = buildItem;

  return root;
}

function indexDefinitions(
  items: QuestionnaireItem[],
  map: Map<string, QuestionnaireItem>,
): void {
  for (const item of items) {
    map.set(item.linkId, item);
    if (item.item) {
      indexDefinitions(item.item, map);
    }
  }
}

function hydrateChildren(
  definitions: QuestionnaireItem[],
  responseItems: QuestionnaireResponseItem[],
  parent: ResponseNode,
  root: QuestionnaireResponseModel,
): ResponseItem[] {
  const result: ResponseItem[] = [];
  const consumed = new Set<number>();

  for (const def of definitions) {
    const matches: QuestionnaireResponseItem[] = [];
    for (let i = 0; i < responseItems.length; i++) {
      if (!consumed.has(i) && responseItems[i].linkId === def.linkId) {
        matches.push(responseItems[i]);
        consumed.add(i);
      }
    }

    if (matches.length === 0) {
      const item = buildItem(def, undefined, parent, root);
      root.registerItem(item);
      result.push(item);
    } else {
      for (const ri of matches) {
        const item = buildItem(def, ri, parent, root);
        root.registerItem(item);
        result.push(item);
      }
    }
  }

  return result;
}

/**
 * Build a single reactive ResponseItem from a questionnaire definition and
 * optional pre-existing response data. Wires up signals for calculated
 * expressions, enableWhen logic, and answer option toggles. Returns a
 * FlatResponseItem for groups/simple items, or an AnswerEntryResponseItem
 * for non-group items with child definitions (the FHIR answer[].item[] pattern).
 */
function buildItem(
  definition: QuestionnaireItem,
  responseItem: QuestionnaireResponseItem | undefined,
  parent: ResponseNode,
  root: QuestionnaireResponseModel,
): ResponseItem {
  const calculatedExpression = getCalculatedExpression(definition.extension);
  const enableWhenExpression = getEnableWhenExpression(definition.extension);
  const type = definition.type;

  // Detect non-group items with child definitions → per-answer children
  const hasAnswerItems =
    type !== "group" && definition.item != null && definition.item.length > 0;

  let children: ResponseItem[] = [];
  let answerEntries: ResponseAnswer[] | null = null;
  let initialAnswers: AnswerValue[];

  if (hasAnswerItems) {
    // Build per-answer children from answer[].item[]
    const responseAnswers = responseItem?.answer ?? [];
    answerEntries = responseAnswers.map((ans) => {
      const value = stripAnswerValue(ans);
      const entryChildren = hydrateChildren(
        definition.item!,
        ans.item ?? [],
        null as unknown as ResponseNode,
        root,
      );
      return new ResponseAnswer(value, entryChildren);
    });
    initialAnswers = responseAnswers.map(stripAnswerValue);
  } else {
    initialAnswers = responseItem?.answer
      ? responseItem.answer.map(stripAnswerValue)
      : [];

    // Build children at the item level (groups and items without answer nesting)
    children = hydrateChildren(
      definition.item ?? [],
      responseItem?.item ?? [],
      null as unknown as ResponseItem,
      root,
    );
  }

  // Wire calculated answer signal
  const calculatedAnswer = calculatedExpression
    ? new Signal.Computed<AnswerValue[] | null>(() => {
        const results = evaluateFhirPath(calculatedExpression.expression, root);
        if (results.length === 0 || results[0] == null) return null;
        return results.map((v) => toAnswerValue(v, type)) as AnswerValue[];
      })
    : null;

  const enabledResolver = buildEnabledResolver(definition, enableWhenExpression, root);

  // Build answer options with toggle signals
  const answerOptions = buildAnswerOptions(definition, root);

  const shared = {
    linkId: definition.linkId,
    text: definition.text ?? "",
    type,
    id: responseItem?.id,
    initialAnswers,
    enabledResolver,
    items: children,
    answerOptions,
    parent,
    root,
    calculatedExpression,
  };

  const item: ResponseItem = hasAnswerItems
    ? new AnswerEntryResponseItem({ ...shared, answerEntries: answerEntries! })
    : new FlatResponseItem({ ...shared, calculatedAnswer });

  // Fix parent reference for item-level children
  for (const child of children) {
    (child as { parent: ResponseNode }).parent = item;
  }

  // Fix parent reference for answer entry children
  if (answerEntries) {
    for (const entry of answerEntries) {
      for (const child of entry.items) {
        child.parent = item;
      }
    }
  }

  return item;
}

function buildEnabledResolver(
  definition: QuestionnaireItem,
  enableWhenExpr: { expression: string } | null,
  root: QuestionnaireResponseModel,
): EnabledResolver {
  if (enableWhenExpr) {
    const expression = enableWhenExpr.expression;
    return () => {
      const results = evaluateFhirPath(expression, root);
      return results.length > 0 && results[0] === true;
    };
  }

  if (definition.enableWhen && definition.enableWhen.length > 0) {
    const conditions = definition.enableWhen;
    const behavior = definition.enableBehavior ?? "all";
    return (item) => {
      return evaluateEnableWhen(conditions, behavior, (linkId) => {
        const resolved = item.findNearestItem(linkId);
        if (!resolved) return null;
        return resolved.answerValues;
      });
    };
  }

  return () => true;
}

function buildAnswerOptions(
  definition: QuestionnaireItem,
  root: QuestionnaireResponseModel,
): AnswerOption[] {
  if (!definition.answerOption || definition.answerOption.length === 0)
    return [];

  const toggleExpressions = getAnswerOptionsToggleExpressions(
    definition.extension,
  );

  const toggleSignals = toggleExpressions.map(
    (toggle) =>
      new Signal.Computed<boolean>(() => {
        const results = evaluateFhirPath(toggle.expression.expression, root);
        return results.length > 0 && results[0] === true;
      }),
  );

  const alwaysEnabled = ALWAYS_TRUE;

  return definition.answerOption.map((opt) => {
    const value: AnswerValue = { ...opt };
    delete (value as Record<string, unknown>).initialSelected;

    let signal = alwaysEnabled;
    for (let i = 0; i < toggleExpressions.length; i++) {
      const toggle = toggleExpressions[i];
      if (toggle.options.some((tv) => answerValuesMatch(tv, value))) {
        signal = toggleSignals[i];
        break;
      }
    }

    return new AnswerOption(value, opt.initialSelected ?? false, signal);
  });
}

function stripAnswerValue(answer: AnswerValue): AnswerValue {
  const result: AnswerValue = {};
  for (const key of ANSWER_VALUE_KEYS) {
    if (answer[key] !== undefined) {
      (result as Record<string, unknown>)[key] = answer[key];
    }
  }
  return result;
}

function toAnswerValue(
  raw: unknown,
  type: QuestionnaireItemType,
): AnswerValue | null {
  if (raw == null) return null;

  if (typeof raw === "number") {
    if (type === "integer") return { valueInteger: Math.round(raw) };
    return { valueDecimal: raw };
  }

  if (typeof raw === "string") {
    if (type === "date") return { valueDate: raw };
    if (type === "dateTime") return { valueDateTime: raw };
    return { valueString: raw };
  }

  if (typeof raw === "boolean") return { valueBoolean: raw };

  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if ("code" in obj)
      return { valueCoding: obj as AnswerValue["valueCoding"] };
    if ("value" in obj)
      return { valueQuantity: obj as AnswerValue["valueQuantity"] };
  }

  return null;
}
