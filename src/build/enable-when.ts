import type {
  AnswerValue,
  Coding,
  EnableBehavior,
  EnableWhen,
  EnableWhenOperator,
  Quantity,
} from "../model/types.js";

/**
 * Evaluate a list of enableWhen conditions against current answers.
 * `getAnswers` is called to look up the current answers for a referenced linkId.
 */
export function evaluateEnableWhen(
  conditions: EnableWhen[],
  behavior: EnableBehavior,
  getAnswers: (linkId: string) => AnswerValue[] | null,
): boolean {
  const check = (c: EnableWhen) => evaluateCondition(c, getAnswers);
  return behavior === "any"
    ? conditions.some(check)
    : conditions.every(check);
}

function evaluateCondition(
  condition: EnableWhen,
  getAnswers: (linkId: string) => AnswerValue[] | null,
): boolean {
  const answers = getAnswers(condition.question);
  const hasAnswer = answers !== null && answers.length > 0;

  if (condition.operator === "exists") {
    const expectExists = condition.answerBoolean ?? true;
    return expectExists === hasAnswer;
  }

  if (!hasAnswer) return false;

  return answers!.some((answer) => compareAnswer(condition.operator, condition, answer));
}

function compareAnswer(
  operator: EnableWhenOperator,
  condition: EnableWhen,
  answer: AnswerValue,
): boolean {
  if (condition.answerBoolean !== undefined)
    return compareOrdered(operator, answer.valueBoolean, condition.answerBoolean);
  if (condition.answerDecimal !== undefined)
    return compareOrdered(operator, answer.valueDecimal, condition.answerDecimal);
  if (condition.answerInteger !== undefined)
    return compareOrdered(operator, answer.valueInteger, condition.answerInteger);
  if (condition.answerDate !== undefined)
    return compareOrdered(operator, answer.valueDate, condition.answerDate);
  if (condition.answerDateTime !== undefined)
    return compareOrdered(operator, answer.valueDateTime, condition.answerDateTime);
  if (condition.answerTime !== undefined)
    return compareOrdered(operator, answer.valueTime, condition.answerTime);
  if (condition.answerString !== undefined)
    return compareOrdered(operator, answer.valueString, condition.answerString);
  if (condition.answerCoding !== undefined)
    return compareCoding(operator, answer.valueCoding, condition.answerCoding);
  if (condition.answerQuantity !== undefined)
    return compareQuantity(operator, answer.valueQuantity, condition.answerQuantity);

  return false;
}

function compareOrdered<T extends string | number | boolean>(
  operator: EnableWhenOperator,
  actual: T | undefined,
  expected: T,
): boolean {
  if (actual === undefined) return false;

  switch (operator) {
    case "=":  return actual === expected;
    case "!=": return actual !== expected;
    case ">":  return actual > expected;
    case "<":  return actual < expected;
    case ">=": return actual >= expected;
    case "<=": return actual <= expected;
    default:   return false;
  }
}

function compareCoding(
  operator: EnableWhenOperator,
  actual: Coding | undefined,
  expected: Coding,
): boolean {
  if (!actual) return false;

  const codeMatch = actual.code === expected.code;
  const systemMatch = !expected.system || actual.system === expected.system;
  const match = codeMatch && systemMatch;

  switch (operator) {
    case "=":  return match;
    case "!=": return !match;
    default:   return false;
  }
}

function compareQuantity(
  operator: EnableWhenOperator,
  actual: Quantity | undefined,
  expected: Quantity,
): boolean {
  if (!actual || actual.value === undefined || expected.value === undefined)
    return false;

  return compareOrdered(operator, actual.value, expected.value);
}
