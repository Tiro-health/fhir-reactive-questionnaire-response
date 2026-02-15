import type { Questionnaire, QuestionnaireResponse } from "../../src/model/types.js";

export const bmiQuestionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "bmi-calculator",
  status: "active",
  title: "BMI Calculator",
  item: [
    {
      linkId: "weight",
      text: "Weight (kg)",
      type: "decimal",
      required: true,
    },
    {
      linkId: "height",
      text: "Height (cm)",
      type: "decimal",
      required: true,
    },
    {
      linkId: "bmi",
      text: "BMI",
      type: "decimal",
      readOnly: true,
      extension: [
        {
          url: "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression",
          valueExpression: {
            language: "text/fhirpath",
            expression:
              "%resource.item.where(linkId='weight').answer.value / (%resource.item.where(linkId='height').answer.value / 100).power(2)",
          },
        },
      ],
    },
    {
      linkId: "bmi-category",
      text: "BMI Category",
      type: "string",
      readOnly: true,
      extension: [
        {
          url: "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression",
          valueExpression: {
            language: "text/fhirpath",
            expression:
              "iif(%resource.item.where(linkId='bmi').answer.value < 18.5, 'Underweight', iif(%resource.item.where(linkId='bmi').answer.value < 25, 'Normal', iif(%resource.item.where(linkId='bmi').answer.value < 30, 'Overweight', 'Obese')))",
          },
        },
      ],
    },
  ],
};

export const emptyBmiResponse: QuestionnaireResponse = {
  resourceType: "QuestionnaireResponse",
  status: "in-progress",
  questionnaire: "bmi-calculator",
  item: [
    { linkId: "weight" },
    { linkId: "height" },
    { linkId: "bmi" },
    { linkId: "bmi-category" },
  ],
};

export const filledBmiResponse: QuestionnaireResponse = {
  resourceType: "QuestionnaireResponse",
  status: "in-progress",
  questionnaire: "bmi-calculator",
  item: [
    { linkId: "weight", answer: [{ valueDecimal: 80 }] },
    { linkId: "height", answer: [{ valueDecimal: 180 }] },
    { linkId: "bmi" },
    { linkId: "bmi-category" },
  ],
};
