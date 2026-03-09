import { ANSWER_VALUE_KEYS, type AnswerValue, type Extension } from "../model/types.js";

// SDC extension URLs
export const CALCULATED_EXPRESSION =
  "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression";

export const ENABLE_WHEN_EXPRESSION =
  "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-enableWhenExpression";

export const ANSWER_OPTIONS_TOGGLE_EXPRESSION =
  "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-answerOptionsToggleExpression";

export interface ParsedExpression {
  language: string;
  expression: string;
}

export function findExpression(
  extensions: Extension[] | undefined,
  url: string,
): ParsedExpression | null {
  if (!extensions) return null;

  const ext = extensions.find((e) => e.url === url);
  if (!ext?.valueExpression) return null;

  return {
    language: ext.valueExpression.language,
    expression: ext.valueExpression.expression,
  };
}

export function getCalculatedExpression(
  extensions: Extension[] | undefined,
): ParsedExpression | null {
  return findExpression(extensions, CALCULATED_EXPRESSION);
}

export function getEnableWhenExpression(
  extensions: Extension[] | undefined,
): ParsedExpression | null {
  return findExpression(extensions, ENABLE_WHEN_EXPRESSION);
}

export interface ParsedToggleExpression {
  options: AnswerValue[];
  expression: ParsedExpression;
}

export function getAnswerOptionsToggleExpressions(
  extensions: Extension[] | undefined,
): ParsedToggleExpression[] {
  if (!extensions) return [];

  const results: ParsedToggleExpression[] = [];

  for (const ext of extensions) {
    if (ext.url !== ANSWER_OPTIONS_TOGGLE_EXPRESSION || !ext.extension) continue;

    const options: AnswerValue[] = [];
    let expression: ParsedExpression | null = null;

    for (const sub of ext.extension) {
      if (sub.url === "option") {
        const opt: AnswerValue = {};
        if (sub.valueCoding !== undefined) opt.valueCoding = sub.valueCoding;
        else if (sub.valueString !== undefined) opt.valueString = sub.valueString;
        else if (sub.valueInteger !== undefined) opt.valueInteger = sub.valueInteger;
        else if (sub.valueDecimal !== undefined) opt.valueDecimal = sub.valueDecimal;
        else if (sub.valueBoolean !== undefined) opt.valueBoolean = sub.valueBoolean;
        options.push(opt);
      } else if (sub.url === "expression" && sub.valueExpression) {
        expression = {
          language: sub.valueExpression.language,
          expression: sub.valueExpression.expression,
        };
      }
    }

    if (expression && options.length > 0) {
      results.push({ options, expression });
    }
  }

  return results;
}

export function answerValuesMatch(a: AnswerValue, b: AnswerValue): boolean {
  if (a.valueCoding && b.valueCoding) {
    return (
      a.valueCoding.code === b.valueCoding.code &&
      a.valueCoding.system === b.valueCoding.system
    );
  }
  for (const key of ANSWER_VALUE_KEYS) {
    if (key === "valueCoding" || key === "valueQuantity") continue;
    if (a[key] !== undefined && b[key] !== undefined) return a[key] === b[key];
  }
  return false;
}
