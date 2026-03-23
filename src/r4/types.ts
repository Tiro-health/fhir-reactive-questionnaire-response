// FHIR R4 type definitions for Questionnaire + QuestionnaireResponse

import type {
  Coding,
  Quantity,
  Extension,
  AnswerValue,
  AnswerOption,
  EnableWhen,
  EnableWhenOperator,
  EnableBehavior,
  QuestionnaireResponseItem,
  QuestionnaireResponseAnswer,
} from "../model/types.js";

export type {
  Coding,
  Quantity,
  Extension,
  AnswerValue,
  AnswerOption,
  EnableWhen,
  EnableWhenOperator,
  EnableBehavior,
  QuestionnaireResponseItem,
  QuestionnaireResponseAnswer,
};

export type R4QuestionnaireItemType =
  | "group"
  | "display"
  | "boolean"
  | "decimal"
  | "integer"
  | "date"
  | "dateTime"
  | "time"
  | "string"
  | "text"
  | "url"
  | "choice"
  | "open-choice"
  | "attachment"
  | "reference"
  | "quantity";

export interface R4QuestionnaireItem {
  linkId: string;
  text?: string;
  type: R4QuestionnaireItemType;
  required?: boolean;
  readOnly?: boolean;
  repeats?: boolean;
  enableWhen?: EnableWhen[];
  enableBehavior?: EnableBehavior;
  answerOption?: AnswerOption[];
  item?: R4QuestionnaireItem[];
  extension?: Extension[];
}

export interface R4Questionnaire {
  resourceType: "Questionnaire";
  id?: string;
  status: string;
  title?: string;
  item?: R4QuestionnaireItem[];
}

export interface R4QuestionnaireResponse {
  resourceType: "QuestionnaireResponse";
  id?: string;
  status: string;
  questionnaire?: string;
  item?: QuestionnaireResponseItem[];
}
