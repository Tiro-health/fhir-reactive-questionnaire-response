// Minimal FHIR R5 type subsets for Questionnaire + QuestionnaireResponse

export type QuestionnaireItemType =
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
  | "coding"
  | "attachment"
  | "reference"
  | "quantity";

export interface Coding {
  system?: string;
  code?: string;
  display?: string;
}

export interface Quantity {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}

export interface Extension {
  url: string;
  valueExpression?: {
    language: string;
    expression: string;
  };
  valueString?: string;
  valueBoolean?: boolean;
  valueDecimal?: number;
  valueInteger?: number;
  valueCoding?: Coding;
  extension?: Extension[];
}

export interface AnswerOption extends AnswerValue {
  initialSelected?: boolean;
}

export interface AnswerValue {
  valueBoolean?: boolean;
  valueDecimal?: number;
  valueInteger?: number;
  valueString?: string;
  valueCoding?: Coding;
  valueQuantity?: Quantity;
  valueDate?: string;
  valueDateTime?: string;
  valueTime?: string;
  valueUri?: string;
  extension?: Extension[];
}

export const ANSWER_VALUE_KEYS = [
  "valueBoolean",
  "valueDecimal",
  "valueInteger",
  "valueString",
  "valueCoding",
  "valueQuantity",
  "valueDate",
  "valueDateTime",
  "valueTime",
  "valueUri",
] as const satisfies readonly (keyof AnswerValue)[];

export type EnableWhenOperator =
  | "exists"
  | "="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<=";

export type EnableBehavior = "all" | "any";

export interface EnableWhen {
  question: string;
  operator: EnableWhenOperator;
  answerBoolean?: boolean;
  answerDecimal?: number;
  answerInteger?: number;
  answerDate?: string;
  answerDateTime?: string;
  answerTime?: string;
  answerString?: string;
  answerCoding?: Coding;
  answerQuantity?: Quantity;
}

export interface QuestionnaireItem {
  linkId: string;
  text?: string;
  type: QuestionnaireItemType;
  required?: boolean;
  readOnly?: boolean;
  repeats?: boolean;
  answerConstraint?: "optionsOnly" | "optionsOrType" | "optionsOrString";
  disabledDisplay?: "hidden" | "protected";
  enableWhen?: EnableWhen[];
  enableBehavior?: EnableBehavior;
  answerOption?: AnswerOption[];
  item?: QuestionnaireItem[];
  extension?: Extension[];
}

export interface Questionnaire {
  resourceType: "Questionnaire";
  id?: string;
  status: string;
  title?: string;
  item?: QuestionnaireItem[];
}

export interface QuestionnaireResponseItem {
  id?: string;
  linkId: string;
  text?: string;
  answer?: QuestionnaireResponseAnswer[];
  item?: QuestionnaireResponseItem[];
}

export interface QuestionnaireResponseAnswer extends AnswerValue {
  item?: QuestionnaireResponseItem[];
}

export interface QuestionnaireResponse {
  resourceType: "QuestionnaireResponse";
  id?: string;
  status: string;
  questionnaire: string;
  item?: QuestionnaireResponseItem[];
}
