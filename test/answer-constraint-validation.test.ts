import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../src/build/build.js";
import type { Questionnaire } from "../src/model/types.js";

const questionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "constraint-validation-test",
  status: "active",
  item: [
    {
      linkId: "options-only",
      text: "Closed list",
      type: "coding",
      answerConstraint: "optionsOnly",
      answerOption: [
        { valueCoding: { code: "a", system: "http://test", display: "A" } },
        { valueCoding: { code: "b", system: "http://test", display: "B" } },
      ],
    },
    {
      linkId: "options-or-string",
      text: "Options or string",
      type: "coding",
      answerConstraint: "optionsOrString",
      answerOption: [
        { valueCoding: { code: "x", system: "http://test", display: "X" } },
      ],
    },
    {
      linkId: "options-or-type",
      text: "Options or type",
      type: "coding",
      answerConstraint: "optionsOrType",
      answerOption: [
        { valueCoding: { code: "y", system: "http://test", display: "Y" } },
      ],
    },
    {
      linkId: "implicit-options-only",
      text: "No explicit constraint (defaults to optionsOnly)",
      type: "coding",
      answerOption: [
        { valueCoding: { code: "c", system: "http://test", display: "C" } },
      ],
    },
    {
      linkId: "no-options",
      text: "No answer options defined",
      type: "string",
    },
  ],
};

describe("answerConstraint validation", () => {
  describe("optionsOnly", () => {
    it("is valid when answer matches an option", () => {
      const rqr = buildQuestionnaireResponse(questionnaire);
      const [item] = rqr.getItems("options-only");

      item.setAnswer([
        { valueCoding: { code: "a", system: "http://test", display: "A" } },
      ]);
      expect(item.valid).toBe(true);
      expect(item.errors).toHaveLength(0);
    });

    it("has error when answer does not match any option", () => {
      const rqr = buildQuestionnaireResponse(questionnaire);
      const [item] = rqr.getItems("options-only");

      item.setAnswer([
        { valueCoding: { code: "z", system: "http://test", display: "Z" } },
      ]);
      expect(item.valid).toBe(false);
      expect(item.errors).toHaveLength(1);
      expect(item.errors[0].type).toBe("answerConstraint");
    });

    it("has error for each non-matching answer", () => {
      const rqr = buildQuestionnaireResponse(questionnaire);
      const [item] = rqr.getItems("options-only");

      item.setAnswer([
        { valueCoding: { code: "z", system: "http://test" } },
        { valueCoding: { code: "a", system: "http://test" } }, // matches
        { valueCoding: { code: "w", system: "http://test" } },
      ]);
      expect(item.errors.filter((e) => e.type === "answerConstraint")).toHaveLength(2);
    });
  });

  describe("optionsOrString", () => {
    it("is valid when answer matches an option", () => {
      const rqr = buildQuestionnaireResponse(questionnaire);
      const [item] = rqr.getItems("options-or-string");

      item.setAnswer([
        { valueCoding: { code: "x", system: "http://test" } },
      ]);
      expect(item.valid).toBe(true);
    });

    it("is valid when answer is a free-text string", () => {
      const rqr = buildQuestionnaireResponse(questionnaire);
      const [item] = rqr.getItems("options-or-string");

      item.setAnswer([{ valueString: "custom text" }]);
      expect(item.valid).toBe(true);
    });

    it("has error when answer is neither an option nor a string", () => {
      const rqr = buildQuestionnaireResponse(questionnaire);
      const [item] = rqr.getItems("options-or-string");

      item.setAnswer([
        { valueCoding: { code: "unknown", system: "http://other" } },
      ]);
      expect(item.valid).toBe(false);
      expect(item.errors[0].type).toBe("answerConstraint");
    });
  });

  describe("optionsOrType", () => {
    it("is valid when answer matches an option", () => {
      const rqr = buildQuestionnaireResponse(questionnaire);
      const [item] = rqr.getItems("options-or-type");

      item.setAnswer([
        { valueCoding: { code: "y", system: "http://test" } },
      ]);
      expect(item.valid).toBe(true);
    });

    it("is valid when answer is any value (no constraint error)", () => {
      const rqr = buildQuestionnaireResponse(questionnaire);
      const [item] = rqr.getItems("options-or-type");

      item.setAnswer([
        { valueCoding: { code: "anything", system: "http://other" } },
      ]);
      expect(item.valid).toBe(true);
      expect(item.errors).toHaveLength(0);
    });
  });

  describe("implicit optionsOnly (no answerConstraint set)", () => {
    it("defaults to optionsOnly behavior", () => {
      const rqr = buildQuestionnaireResponse(questionnaire);
      const [item] = rqr.getItems("implicit-options-only");

      item.setAnswer([
        { valueCoding: { code: "unknown", system: "http://test" } },
      ]);
      expect(item.errors.some((e) => e.type === "answerConstraint")).toBe(true);
    });
  });

  describe("no answerOption defined", () => {
    it("skips constraint validation entirely", () => {
      const rqr = buildQuestionnaireResponse(questionnaire);
      const [item] = rqr.getItems("no-options");

      item.setAnswer([{ valueString: "anything" }]);
      expect(item.valid).toBe(true);
    });
  });
});
