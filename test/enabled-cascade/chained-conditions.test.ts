import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../../src/build/build.js";
import type { Questionnaire } from "../../src/model/types.js";

const questionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "chained-conditions",
  status: "active",
  item: [
    { linkId: "has-condition", text: "Do you have a condition?", type: "boolean" },
    {
      linkId: "condition-type",
      text: "Type of condition",
      type: "coding",
      enableWhen: [
        { question: "has-condition", operator: "=", answerBoolean: true },
      ],
      answerOption: [
        { valueCoding: { system: "http://example.org", code: "allergy" } },
        { valueCoding: { system: "http://example.org", code: "chronic" } },
      ],
    },
    {
      linkId: "allergy-details",
      text: "Allergy details",
      type: "string",
      enableWhen: [
        {
          question: "condition-type",
          operator: "=",
          answerCoding: { system: "http://example.org", code: "allergy" },
        },
      ],
    },
  ],
};

describe("chained enableWhen conditions (A → B → C)", () => {
  it("all downstream items start disabled", () => {
    const model = buildQuestionnaireResponse(questionnaire);

    expect(model.getItems("has-condition")[0].enabled).toBe(true);
    expect(model.getItems("condition-type")[0].enabled).toBe(false);
    expect(model.getItems("allergy-details")[0].enabled).toBe(false);
  });

  it("enabling step 1 enables step 2 but not step 3", () => {
    const model = buildQuestionnaireResponse(questionnaire);
    const [hasCondition] = model.getItems("has-condition");

    hasCondition.setAnswer([{ valueBoolean: true }]);

    expect(model.getItems("condition-type")[0].enabled).toBe(true);
    expect(model.getItems("allergy-details")[0].enabled).toBe(false);
  });

  it("selecting the right option at step 2 enables step 3", () => {
    const model = buildQuestionnaireResponse(questionnaire);
    const [hasCondition] = model.getItems("has-condition");
    const [conditionType] = model.getItems("condition-type");

    hasCondition.setAnswer([{ valueBoolean: true }]);
    conditionType.setAnswer([
      { valueCoding: { system: "http://example.org", code: "allergy" } },
    ]);

    expect(model.getItems("allergy-details")[0].enabled).toBe(true);
  });

  it("selecting a different option at step 2 keeps step 3 disabled", () => {
    const model = buildQuestionnaireResponse(questionnaire);
    const [hasCondition] = model.getItems("has-condition");
    const [conditionType] = model.getItems("condition-type");

    hasCondition.setAnswer([{ valueBoolean: true }]);
    conditionType.setAnswer([
      { valueCoding: { system: "http://example.org", code: "chronic" } },
    ]);

    expect(model.getItems("allergy-details")[0].enabled).toBe(false);
  });

  it("disabling step 1 disables step 2 but step 3 reacts to step 2 independently", () => {
    const model = buildQuestionnaireResponse(questionnaire);
    const [hasCondition] = model.getItems("has-condition");
    const [conditionType] = model.getItems("condition-type");

    // Enable chain fully
    hasCondition.setAnswer([{ valueBoolean: true }]);
    conditionType.setAnswer([
      { valueCoding: { system: "http://example.org", code: "allergy" } },
    ]);
    expect(model.getItems("allergy-details")[0].enabled).toBe(true);

    // Disable step 1 — step 2 disables, but step 3 stays enabled because
    // condition-type still holds its answer value (no cascade clearing)
    hasCondition.setAnswer([{ valueBoolean: false }]);

    expect(model.getItems("condition-type")[0].enabled).toBe(false);
    // Step 3 still sees condition-type's answer → remains enabled
    expect(model.getItems("allergy-details")[0].enabled).toBe(true);
  });
});
