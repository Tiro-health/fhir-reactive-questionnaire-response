import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../src/build/build.js";
import type { Questionnaire, QuestionnaireResponse } from "../src/model/types.js";
import { answerValuesMatch } from "../src/build/extensions.js";

const medicationQuestionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "medication-toggle",
  status: "active",
  item: [
    {
      linkId: "enable-nsaids",
      text: "Enable NSAIDs?",
      type: "boolean",
    },
    {
      linkId: "medication",
      text: "Select medication",
      type: "coding",
      answerOption: [
        {
          valueCoding: {
            system: "http://example.org/meds",
            code: "acetaminophen",
            display: "Acetaminophen",
          },
        },
        {
          valueCoding: {
            system: "http://example.org/meds",
            code: "aspirin",
            display: "Aspirin",
          },
        },
        {
          valueCoding: {
            system: "http://example.org/meds",
            code: "ibuprofen",
            display: "Ibuprofen",
          },
        },
      ],
      extension: [
        {
          url: "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-answerOptionsToggleExpression",
          extension: [
            {
              url: "option",
              valueCoding: {
                system: "http://example.org/meds",
                code: "aspirin",
                display: "Aspirin",
              },
            },
            {
              url: "option",
              valueCoding: {
                system: "http://example.org/meds",
                code: "ibuprofen",
                display: "Ibuprofen",
              },
            },
            {
              url: "expression",
              valueExpression: {
                language: "text/fhirpath",
                expression:
                  "%resource.item.where(linkId='enable-nsaids').answer.value = true",
              },
            },
          ],
        },
      ],
    },
  ],
};

function createModel(enableNsaids: boolean = false) {
  const response: QuestionnaireResponse = {
    resourceType: "QuestionnaireResponse",
    status: "in-progress",
    item: [
      { linkId: "enable-nsaids", answer: [{ valueBoolean: enableNsaids }] },
      { linkId: "medication" },
    ],
  };
  return buildQuestionnaireResponse(medicationQuestionnaire, response);
}

describe("answerOptions", () => {
  it("exposes answerOptions on choice items", () => {
    const rqr = createModel();
    const [medication] = rqr.getItems("medication");

    expect(medication.answerOptions).toHaveLength(3);
    expect(medication.answerOptions[0].value.valueCoding?.code).toBe(
      "acetaminophen",
    );
    expect(medication.answerOptions[1].value.valueCoding?.code).toBe("aspirin");
    expect(medication.answerOptions[2].value.valueCoding?.code).toBe(
      "ibuprofen",
    );
  });

  it("returns empty array when no answerOption defined", () => {
    const rqr = createModel();
    const [toggle] = rqr.getItems("enable-nsaids");

    expect(toggle.answerOptions).toEqual([]);
  });
});

describe("answerOptionsToggleExpression", () => {
  it("disables toggled options when expression is false", () => {
    const rqr = createModel(false);
    const [medication] = rqr.getItems("medication");

    expect(medication.answerOptions[0].enabled).toBe(true); // acetaminophen: always
    expect(medication.answerOptions[1].enabled).toBe(false); // aspirin: toggled
    expect(medication.answerOptions[2].enabled).toBe(false); // ibuprofen: toggled
  });

  it("enables toggled options when expression is true", () => {
    const rqr = createModel(true);
    const [medication] = rqr.getItems("medication");

    expect(medication.answerOptions[0].enabled).toBe(true);
    expect(medication.answerOptions[1].enabled).toBe(true);
    expect(medication.answerOptions[2].enabled).toBe(true);
  });

  it("reactively updates when dependency changes", () => {
    const rqr = createModel(false);
    const [toggle] = rqr.getItems("enable-nsaids");
    const [medication] = rqr.getItems("medication");

    expect(medication.answerOptions[1].enabled).toBe(false);
    expect(medication.answerOptions[2].enabled).toBe(false);

    toggle.setAnswer([{ valueBoolean: true }]);

    expect(medication.answerOptions[1].enabled).toBe(true);
    expect(medication.answerOptions[2].enabled).toBe(true);
  });

  it("disables again when dependency reverts", () => {
    const rqr = createModel(true);
    const [toggle] = rqr.getItems("enable-nsaids");
    const [medication] = rqr.getItems("medication");

    expect(medication.answerOptions[1].enabled).toBe(true);

    toggle.setAnswer([{ valueBoolean: false }]);

    expect(medication.answerOptions[1].enabled).toBe(false);
    expect(medication.answerOptions[2].enabled).toBe(false);
  });

  it("untoggled options remain always enabled", () => {
    const rqr = createModel(false);
    const [toggle] = rqr.getItems("enable-nsaids");
    const [medication] = rqr.getItems("medication");

    expect(medication.answerOptions[0].enabled).toBe(true);

    toggle.setAnswer([{ valueBoolean: true }]);
    expect(medication.answerOptions[0].enabled).toBe(true);

    toggle.setAnswer([{ valueBoolean: false }]);
    expect(medication.answerOptions[0].enabled).toBe(true);
  });
});

describe("answerValuesMatch", () => {
  it("matches codings by system+code", () => {
    const a = {
      valueCoding: { system: "http://example.org", code: "a", display: "A" },
    };
    const b = {
      valueCoding: {
        system: "http://example.org",
        code: "a",
        display: "Different",
      },
    };
    expect(answerValuesMatch(a, b)).toBe(true);
  });

  it("rejects codings with different codes", () => {
    const a = { valueCoding: { system: "http://example.org", code: "a" } };
    const b = { valueCoding: { system: "http://example.org", code: "b" } };
    expect(answerValuesMatch(a, b)).toBe(false);
  });

  it("matches primitive strings", () => {
    expect(
      answerValuesMatch({ valueString: "hello" }, { valueString: "hello" }),
    ).toBe(true);
    expect(
      answerValuesMatch({ valueString: "hello" }, { valueString: "world" }),
    ).toBe(false);
  });

  it("matches integers", () => {
    expect(
      answerValuesMatch({ valueInteger: 42 }, { valueInteger: 42 }),
    ).toBe(true);
    expect(
      answerValuesMatch({ valueInteger: 42 }, { valueInteger: 99 }),
    ).toBe(false);
  });

  it("returns false for mismatched types", () => {
    expect(
      answerValuesMatch({ valueString: "42" }, { valueInteger: 42 }),
    ).toBe(false);
  });
});

describe("answerOptions with string values", () => {
  it("works with valueString options", () => {
    const q: Questionnaire = {
      resourceType: "Questionnaire",
      id: "string-options",
      status: "active",
      item: [
        {
          linkId: "toggle",
          text: "Toggle",
          type: "boolean",
        },
        {
          linkId: "color",
          text: "Favorite color",
          type: "coding",
          answerOption: [
            { valueString: "Red" },
            { valueString: "Blue" },
            { valueString: "Green" },
          ],
          extension: [
            {
              url: "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-answerOptionsToggleExpression",
              extension: [
                { url: "option", valueString: "Red" },
                {
                  url: "expression",
                  valueExpression: {
                    language: "text/fhirpath",
                    expression:
                      "%resource.item.where(linkId='toggle').answer.value = true",
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const r: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "toggle", answer: [{ valueBoolean: false }] },
        { linkId: "color" },
      ],
    };

    const rqr = buildQuestionnaireResponse(q, r);
    const [color] = rqr.getItems("color");

    expect(color.answerOptions[0].enabled).toBe(false); // Red: toggled
    expect(color.answerOptions[1].enabled).toBe(true); // Blue: always
    expect(color.answerOptions[2].enabled).toBe(true); // Green: always
  });
});
