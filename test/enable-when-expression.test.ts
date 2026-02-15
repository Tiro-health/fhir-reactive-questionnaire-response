import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../src/build/build.js";
import type { Questionnaire, QuestionnaireResponse } from "../src/model/types.js";

describe("enableWhenExpression", () => {
  const questionnaire: Questionnaire = {
    resourceType: "Questionnaire",
    id: "enable-test",
    status: "active",
    item: [
      {
        linkId: "has-allergies",
        text: "Do you have allergies?",
        type: "boolean",
      },
      {
        linkId: "allergy-details",
        text: "Describe your allergies",
        type: "string",
        extension: [
          {
            url: "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-enableWhenExpression",
            valueExpression: {
              language: "text/fhirpath",
              expression:
                "%resource.item.where(linkId='has-allergies').answer.value = true",
            },
          },
        ],
      },
    ],
  };

  it("is disabled when condition is not met", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "has-allergies", answer: [{ valueBoolean: false }] },
        { linkId: "allergy-details" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const [details] = rqr.getItems("allergy-details");

    expect(details.enabled).toBe(false);
  });

  it("is enabled when condition is met", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "has-allergies", answer: [{ valueBoolean: true }] },
        { linkId: "allergy-details" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const [details] = rqr.getItems("allergy-details");

    expect(details.enabled).toBe(true);
  });

  it("reactively updates when dependency changes", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "has-allergies", answer: [{ valueBoolean: false }] },
        { linkId: "allergy-details" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const [toggle] = rqr.getItems("has-allergies");
    const [details] = rqr.getItems("allergy-details");

    expect(details.enabled).toBe(false);

    toggle.setAnswer([{ valueBoolean: true }]);

    expect(details.enabled).toBe(true);
  });

  it("defaults to enabled when no enableWhenExpression is present", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [toggle] = rqr.getItems("has-allergies");

    expect(toggle.enabled).toBe(true);
  });

  it("becomes disabled again when condition reverts", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "has-allergies", answer: [{ valueBoolean: true }] },
        { linkId: "allergy-details" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const [toggle] = rqr.getItems("has-allergies");
    const [details] = rqr.getItems("allergy-details");

    expect(details.enabled).toBe(true);

    toggle.setAnswer([{ valueBoolean: false }]);

    expect(details.enabled).toBe(false);
  });
});
