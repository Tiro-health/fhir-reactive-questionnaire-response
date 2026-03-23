import type { Questionnaire, QuestionnaireItem, QuestionnaireResponse } from "../model/types.js";
import type { R4Questionnaire, R4QuestionnaireItem, R4QuestionnaireResponse } from "./types.js";

function convertItem(r5Item: QuestionnaireItem): R4QuestionnaireItem {
  const { answerConstraint, disabledDisplay, item, type, ...rest } = r5Item;
  const result: R4QuestionnaireItem = { ...rest, type: type as R4QuestionnaireItem["type"] };

  if (type === "coding") {
    if (answerConstraint === "optionsOrString" || answerConstraint === "optionsOrType") {
      result.type = "open-choice";
    } else {
      result.type = "choice";
    }
  }

  if (item) {
    result.item = item.map(convertItem);
  }

  return result;
}

export function toR4Questionnaire(q: Questionnaire): R4Questionnaire {
  const { item, ...rest } = q;
  return {
    ...rest,
    item: item?.map(convertItem),
  };
}

export function toR4QuestionnaireResponse(qr: QuestionnaireResponse): R4QuestionnaireResponse {
  const { questionnaire, ...rest } = qr;
  const result: R4QuestionnaireResponse = { ...rest };
  if (questionnaire) {
    result.questionnaire = questionnaire;
  }
  return result;
}
