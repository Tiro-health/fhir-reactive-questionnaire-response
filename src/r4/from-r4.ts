import type { Questionnaire, QuestionnaireItem, QuestionnaireResponse } from "../model/types.js";
import type { R4Questionnaire, R4QuestionnaireItem, R4QuestionnaireResponse } from "./types.js";

function convertItem(r4Item: R4QuestionnaireItem): QuestionnaireItem {
  const { item, type, ...rest } = r4Item;
  const result: QuestionnaireItem = { ...rest, type: type as QuestionnaireItem["type"] };

  if (type === "choice") {
    result.type = "coding";
  } else if (type === "open-choice") {
    result.type = "coding";
    result.answerConstraint = "optionsOrString";
  }

  if (item) {
    result.item = item.map(convertItem);
  }

  return result;
}

export function fromR4Questionnaire(q: R4Questionnaire): Questionnaire {
  const { item, ...rest } = q;
  return {
    ...rest,
    item: item?.map(convertItem),
  };
}

export function fromR4QuestionnaireResponse(qr: R4QuestionnaireResponse): QuestionnaireResponse {
  return {
    ...qr,
    questionnaire: qr.questionnaire ?? "",
  };
}
