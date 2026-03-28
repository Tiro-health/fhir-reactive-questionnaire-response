import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../src/build/build.js";
import type { Questionnaire } from "../src/model/types.js";

const questionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "validation-test",
  status: "active",
  item: [
    {
      linkId: "required-field",
      text: "Required field",
      type: "string",
      required: true,
    },
    {
      linkId: "optional-field",
      text: "Optional field",
      type: "string",
    },
    {
      linkId: "required-coding",
      text: "Required coding",
      type: "coding",
      required: true,
      answerOption: [
        { valueCoding: { code: "a", display: "Option A" } },
        { valueCoding: { code: "b", display: "Option B" } },
      ],
    },
    {
      linkId: "conditional-required",
      text: "Conditionally required",
      type: "string",
      required: true,
      enableWhen: [
        { question: "optional-field", operator: "exists", answerBoolean: true },
      ],
    },
  ],
};

describe("required-field validation", () => {
  it("has error when required field is empty", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [item] = rqr.getItems("required-field");

    expect(item.valid).toBe(false);
    expect(item.errors).toHaveLength(1);
    expect(item.errors[0].type).toBe("required");
  });

  it("is valid when required field has an answer", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [item] = rqr.getItems("required-field");

    item.setAnswer([{ valueString: "hello" }]);
    expect(item.valid).toBe(true);
    expect(item.errors).toHaveLength(0);
  });

  it("optional field is always valid when empty", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [item] = rqr.getItems("optional-field");

    expect(item.valid).toBe(true);
    expect(item.errors).toHaveLength(0);
  });

  it("reactively updates when answer changes", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [item] = rqr.getItems("required-field");

    expect(item.valid).toBe(false);

    item.setAnswer([{ valueString: "filled" }]);
    expect(item.valid).toBe(true);

    item.setAnswer([]);
    expect(item.valid).toBe(false);
  });

  it("validates required coding fields", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [item] = rqr.getItems("required-coding");

    expect(item.valid).toBe(false);

    item.setAnswer([{ valueCoding: { code: "a", display: "Option A" } }]);
    expect(item.valid).toBe(true);
  });

  it("validates conditionally required fields", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [item] = rqr.getItems("conditional-required");

    // Disabled, so not getting answers — but still required in definition
    expect(item.enabled).toBe(false);
    expect(item.valid).toBe(false);

    // Enable it by setting the toggle
    const [toggle] = rqr.getItems("optional-field");
    toggle.setAnswer([{ valueString: "yes" }]);
    expect(item.enabled).toBe(true);

    // Still invalid (no answer)
    expect(item.valid).toBe(false);

    // Fill it in
    item.setAnswer([{ valueString: "done" }]);
    expect(item.valid).toBe(true);
  });
});
