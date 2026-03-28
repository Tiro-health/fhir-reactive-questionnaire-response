// Model
export { QuestionnaireResponseModel } from "./model/QuestionnaireResponse.js";
export type { QuestionnaireResponseStatus, ToFhirOptions } from "./model/QuestionnaireResponse.js";
export type { ResponseItem } from "./model/ResponseItem.js";
export { BaseResponseItem } from "./model/BaseResponseItem.js";
export { FlatResponseItem } from "./model/FlatResponseItem.js";
export { AnswerEntryResponseItem } from "./model/AnswerEntryResponseItem.js";
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

// History
export { FormHistory, type FormHistoryOptions } from "./history.js";

// R4 compatibility
export { fromR4Questionnaire, fromR4QuestionnaireResponse } from "./r4/from-r4.js";
export { toR4Questionnaire, toR4QuestionnaireResponse } from "./r4/to-r4.js";
export type * from "./r4/types.js";

// Backwards-compatible aliases
export { QuestionnaireResponseModel as ReactiveQuestionnaireResponse } from "./model/QuestionnaireResponse.js";
export type { ResponseItem as ReactiveResponseItem } from "./model/ResponseItem.js";
export { AnswerOption as ReactiveAnswerOption } from "./model/AnswerOption.js";
