import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../src/build/build.js";
import type {
  Questionnaire,
  QuestionnaireResponse,
} from "../src/model/types.js";

const ordinalExt = {
  url: "http://hl7.org/fhir/StructureDefinition/ordinalValue",
  valueDecimal: 1,
};

const questionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "ext-test",
  status: "active",
  item: [
    {
      linkId: "pain",
      text: "Pain level",
      type: "coding",
      answerOption: [
        {
          valueCoding: { code: "none", display: "None" },
          extension: [
            {
              url: "http://hl7.org/fhir/StructureDefinition/ordinalValue",
              valueDecimal: 0,
            },
          ],
        },
        {
          valueCoding: { code: "mild", display: "Mild" },
          extension: [ordinalExt],
        },
      ],
    },
  ],
};

describe("answerOption extensions", () => {
  it("preserves extensions on answer option values", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [pain] = rqr.getItems("pain");

    expect(pain.answerOptions[0].value.extension).toEqual([
      {
        url: "http://hl7.org/fhir/StructureDefinition/ordinalValue",
        valueDecimal: 0,
      },
    ]);
    expect(pain.answerOptions[1].value.extension).toEqual([ordinalExt]);
  });

  it("preserves extensions through toFhir() after setting answer", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [pain] = rqr.getItems("pain");

    pain.setAnswer([
      {
        valueCoding: { code: "mild", display: "Mild" },
        extension: [ordinalExt],
      },
    ]);

    const fhir = pain.toFhir();
    expect(fhir.answer?.[0].extension).toEqual([ordinalExt]);
  });

  it("preserves extensions when hydrating from a response", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      questionnaire: "ext-test",
      item: [
        {
          linkId: "pain",
          answer: [
            {
              valueCoding: { code: "mild", display: "Mild" },
              extension: [ordinalExt],
            },
          ],
        },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const [pain] = rqr.getItems("pain");

    expect(pain.answerValues?.[0].extension).toEqual([ordinalExt]);

    const fhir = pain.toFhir();
    expect(fhir.answer?.[0].extension).toEqual([ordinalExt]);
  });
});
