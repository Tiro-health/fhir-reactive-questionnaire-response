import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../src/build/build.js";
import type { Questionnaire } from "../src/model/types.js";

const questionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "constraint-test",
  status: "active",
  item: [
    {
      linkId: "closed",
      text: "Closed list",
      type: "coding",
      answerConstraint: "optionsOnly",
      answerOption: [{ valueCoding: { code: "a" } }],
    },
    {
      linkId: "open-type",
      text: "Options or type",
      type: "coding",
      answerConstraint: "optionsOrType",
      answerOption: [{ valueCoding: { code: "b" } }],
    },
    {
      linkId: "open-string",
      text: "Options or string",
      type: "coding",
      answerConstraint: "optionsOrString",
      answerOption: [{ valueCoding: { code: "c" } }],
    },
    {
      linkId: "default",
      text: "No constraint specified",
      type: "string",
    },
  ],
};

describe("answerConstraint on ResponseItem", () => {
  const rqr = buildQuestionnaireResponse(questionnaire);

  it("exposes optionsOnly", () => {
    expect(rqr.getItems("closed")[0].answerConstraint).toBe("optionsOnly");
  });

  it("exposes optionsOrType", () => {
    expect(rqr.getItems("open-type")[0].answerConstraint).toBe("optionsOrType");
  });

  it("exposes optionsOrString", () => {
    expect(rqr.getItems("open-string")[0].answerConstraint).toBe("optionsOrString");
  });

  it("is undefined when not specified", () => {
    expect(rqr.getItems("default")[0].answerConstraint).toBeUndefined();
  });
});
