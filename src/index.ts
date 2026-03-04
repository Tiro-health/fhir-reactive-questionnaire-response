// Model
export { QuestionnaireResponseModel } from "./model/QuestionnaireResponse.js";
export { ResponseItem } from "./model/ResponseItem.js";
export { ResponseAnswer } from "./model/ResponseAnswer.js";
export { AnswerOption, optionDisplay } from "./model/AnswerOption.js";
export type * from "./model/types.js";

// Build
export { buildQuestionnaireResponse } from "./build/build.js";
export { evaluateFhirPath } from "./build/fhirpath-context.js";
export { evaluateEnableWhen } from "./build/enable-when.js";
export {
  CALCULATED_EXPRESSION,
  ENABLE_WHEN_EXPRESSION,
  ANSWER_OPTIONS_TOGGLE_EXPRESSION,
  getCalculatedExpression,
  getEnableWhenExpression,
  getAnswerOptionsToggleExpressions,
  answerValuesMatch,
} from "./build/extensions.js";

// Backwards-compatible aliases
export { QuestionnaireResponseModel as ReactiveQuestionnaireResponse } from "./model/QuestionnaireResponse.js";
export { ResponseItem as ReactiveResponseItem } from "./model/ResponseItem.js";
export { AnswerOption as ReactiveAnswerOption } from "./model/AnswerOption.js";
