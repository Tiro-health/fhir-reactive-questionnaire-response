import { Signal } from "@lit-labs/signals";
import type {
  AnswerValue,
  Questionnaire,
  QuestionnaireItem,
  QuestionnaireItemType,
  QuestionnaireResponse,
  QuestionnaireResponseItem,
} from "../model/types.js";
import { QuestionnaireResponseModel } from "../model/QuestionnaireResponse.js";
import { ResponseItem } from "../model/ResponseItem.js";
import { AnswerOption } from "../model/AnswerOption.js";
import {
  getCalculatedExpression,
  getEnableWhenExpression,
  getAnswerOptionsToggleExpressions,
  answerValuesMatch,
} from "./extensions.js";
import { evaluateFhirPath } from "./fhirpath-context.js";
import { evaluateEnableWhen } from "./enable-when.js";

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
  parent: ResponseItem | QuestionnaireResponseModel,
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

export function buildItem(
  definition: QuestionnaireItem,
  responseItem: QuestionnaireResponseItem | undefined,
  parent: ResponseItem | QuestionnaireResponseModel,
  root: QuestionnaireResponseModel,
): ResponseItem {
  const calculatedExpression = getCalculatedExpression(definition.extension);
  const enableWhenExpression = getEnableWhenExpression(definition.extension);
  const type = definition.type;

  const initialAnswers = responseItem?.answer
    ? responseItem.answer.map(stripAnswerValue)
    : [];

  // Build children first (they need to exist before signals reference them)
  const children = hydrateChildren(
    definition.item ?? [],
    responseItem?.item ?? [],
    // We don't have `this` item yet — use a placeholder parent.
    // Children only use parent for type info; we fix the reference below.
    null as unknown as ResponseItem,
    root,
  );

  // Wire calculated answer signal
  const calculatedAnswer = calculatedExpression
    ? new Signal.Computed<AnswerValue[] | null>(() => {
        const results = evaluateFhirPath(calculatedExpression.expression, root);
        if (results.length === 0 || results[0] == null) return null;
        return results.map((v) => toAnswerValue(v, type)) as AnswerValue[];
      })
    : null;

  // Wire enabled signal
  const enabled = buildEnabledSignal(definition, enableWhenExpression, root);

  // Build answer options with toggle signals
  const answerOptions = buildAnswerOptions(definition, root);

  const item = new ResponseItem({
    linkId: definition.linkId,
    text: definition.text ?? "",
    type,
    id: responseItem?.id,
    initialAnswers,
    enabled,
    calculatedAnswer,
    items: children,
    answerOptions,
    parent,
    root,
    calculatedExpression,
    enableWhenExpression,
  });

  // Fix parent reference for children
  for (const child of children) {
    (child as { parent: ResponseItem | QuestionnaireResponseModel }).parent = item;
  }

  return item;
}

function buildEnabledSignal(
  definition: QuestionnaireItem,
  enableWhenExpr: { expression: string } | null,
  root: QuestionnaireResponseModel,
): Signal.Computed<boolean> {
  if (enableWhenExpr) {
    const expression = enableWhenExpr.expression;
    return new Signal.Computed<boolean>(() => {
      const results = evaluateFhirPath(expression, root);
      return results.length > 0 && results[0] === true;
    });
  }

  if (definition.enableWhen && definition.enableWhen.length > 0) {
    const conditions = definition.enableWhen;
    const behavior = definition.enableBehavior ?? "all";
    return new Signal.Computed<boolean>(() => {
      return evaluateEnableWhen(conditions, behavior, (linkId) => {
        const items = root.getItems(linkId);
        if (items.length === 0) return null;
        return items[0].answer;
      });
    });
  }

  return new Signal.Computed<boolean>(() => true);
}

function buildAnswerOptions(
  definition: QuestionnaireItem,
  root: QuestionnaireResponseModel,
): AnswerOption[] {
  if (!definition.answerOption || definition.answerOption.length === 0) return [];

  const toggleExpressions = getAnswerOptionsToggleExpressions(definition.extension);

  const toggleSignals = toggleExpressions.map(
    (toggle) =>
      new Signal.Computed<boolean>(() => {
        const results = evaluateFhirPath(toggle.expression.expression, root);
        return results.length > 0 && results[0] === true;
      }),
  );

  const alwaysEnabled = new Signal.Computed<boolean>(() => true);

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
  if (answer.valueBoolean !== undefined)
    result.valueBoolean = answer.valueBoolean;
  if (answer.valueDecimal !== undefined)
    result.valueDecimal = answer.valueDecimal;
  if (answer.valueInteger !== undefined)
    result.valueInteger = answer.valueInteger;
  if (answer.valueString !== undefined) result.valueString = answer.valueString;
  if (answer.valueCoding !== undefined) result.valueCoding = answer.valueCoding;
  if (answer.valueQuantity !== undefined)
    result.valueQuantity = answer.valueQuantity;
  if (answer.valueDate !== undefined) result.valueDate = answer.valueDate;
  if (answer.valueDateTime !== undefined)
    result.valueDateTime = answer.valueDateTime;
  if (answer.valueTime !== undefined) result.valueTime = answer.valueTime;
  if (answer.valueUri !== undefined) result.valueUri = answer.valueUri;
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
