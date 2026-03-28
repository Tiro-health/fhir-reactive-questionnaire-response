import { createContext, useContext } from "react";
import type { QuestionnaireResponseModel } from "../model/QuestionnaireResponse.js";

export const QuestionnaireResponseContext =
  createContext<QuestionnaireResponseModel | null>(null);

/**
 * Access the QuestionnaireResponseModel from context.
 * Must be used within a QuestionnaireResponseContext.Provider.
 */
export function useQuestionnaireResponse(): QuestionnaireResponseModel {
  const model = useContext(QuestionnaireResponseContext);
  if (!model) {
    throw new Error(
      "useQuestionnaireResponse must be used within a QuestionnaireResponseContext.Provider",
    );
  }
  return model;
}
