import { describe, it, expect } from "vitest";
import { toR4Questionnaire, toR4QuestionnaireResponse } from "../../src/r4/to-r4.js";
import { fromR4Questionnaire } from "../../src/r4/from-r4.js";
import type { Questionnaire, QuestionnaireResponse } from "../../src/model/types.js";
import type { R4Questionnaire } from "../../src/r4/types.js";

describe("toR4Questionnaire", () => {
  it("converts coding to choice (default answerConstraint)", () => {
    const r5: Questionnaire = {
      resourceType: "Questionnaire",
      status: "active",
      item: [{ linkId: "q1", type: "coding" }],
    };
    const r4 = toR4Questionnaire(r5);
    expect(r4.item![0].type).toBe("choice");
  });

  it("converts coding with optionsOnly to choice", () => {
    const r5: Questionnaire = {
      resourceType: "Questionnaire",
      status: "active",
      item: [{ linkId: "q1", type: "coding", answerConstraint: "optionsOnly" }],
    };
    const r4 = toR4Questionnaire(r5);
    expect(r4.item![0].type).toBe("choice");
  });

  it("converts coding with optionsOrString to open-choice", () => {
    const r5: Questionnaire = {
      resourceType: "Questionnaire",
      status: "active",
      item: [{ linkId: "q1", type: "coding", answerConstraint: "optionsOrString" }],
    };
    const r4 = toR4Questionnaire(r5);
    expect(r4.item![0].type).toBe("open-choice");
  });

  it("converts coding with optionsOrType to open-choice (lossy)", () => {
    const r5: Questionnaire = {
      resourceType: "Questionnaire",
      status: "active",
      item: [{ linkId: "q1", type: "coding", answerConstraint: "optionsOrType" }],
    };
    const r4 = toR4Questionnaire(r5);
    expect(r4.item![0].type).toBe("open-choice");
  });

  it("strips R5-only fields", () => {
    const r5: Questionnaire = {
      resourceType: "Questionnaire",
      status: "active",
      item: [
        {
          linkId: "q1",
          type: "coding",
          answerConstraint: "optionsOrString",
          disabledDisplay: "protected",
        },
      ],
    };
    const r4 = toR4Questionnaire(r5);
    expect(r4.item![0]).not.toHaveProperty("answerConstraint");
    expect(r4.item![0]).not.toHaveProperty("disabledDisplay");
  });

  it("recursively converts nested items", () => {
    const r5: Questionnaire = {
      resourceType: "Questionnaire",
      status: "active",
      item: [
        {
          linkId: "g1",
          type: "group",
          item: [{ linkId: "q1", type: "coding", answerConstraint: "optionsOrString" }],
        },
      ],
    };
    const r4 = toR4Questionnaire(r5);
    expect(r4.item![0].item![0].type).toBe("open-choice");
  });
});

describe("toR4QuestionnaireResponse", () => {
  it("omits questionnaire when empty string", () => {
    const r5: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      questionnaire: "",
    };
    const r4 = toR4QuestionnaireResponse(r5);
    expect(r4.questionnaire).toBeUndefined();
  });

  it("preserves questionnaire when non-empty", () => {
    const r5: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      questionnaire: "Questionnaire/123",
    };
    const r4 = toR4QuestionnaireResponse(r5);
    expect(r4.questionnaire).toBe("Questionnaire/123");
  });
});

describe("round-trip", () => {
  it("fromR4 → toR4 preserves choice questionnaire", () => {
    const original: R4Questionnaire = {
      resourceType: "Questionnaire",
      status: "active",
      item: [
        { linkId: "q1", type: "choice" },
        { linkId: "q2", type: "open-choice" },
        { linkId: "q3", type: "boolean" },
        {
          linkId: "g1",
          type: "group",
          item: [{ linkId: "q4", type: "choice" }],
        },
      ],
    };
    const roundTripped = toR4Questionnaire(fromR4Questionnaire(original));
    expect(roundTripped).toEqual(original);
  });
});
