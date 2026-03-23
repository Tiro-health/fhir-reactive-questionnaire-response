import { describe, it, expect } from "vitest";
import { fromR4Questionnaire, fromR4QuestionnaireResponse } from "../../src/r4/from-r4.js";
import type { R4Questionnaire, R4QuestionnaireResponse } from "../../src/r4/types.js";

describe("fromR4Questionnaire", () => {
  it("converts choice to coding", () => {
    const r4: R4Questionnaire = {
      resourceType: "Questionnaire",
      status: "active",
      item: [{ linkId: "q1", type: "choice" }],
    };
    const r5 = fromR4Questionnaire(r4);
    expect(r5.item![0].type).toBe("coding");
    expect(r5.item![0].answerConstraint).toBeUndefined();
  });

  it("converts open-choice to coding with optionsOrString", () => {
    const r4: R4Questionnaire = {
      resourceType: "Questionnaire",
      status: "active",
      item: [{ linkId: "q1", type: "open-choice" }],
    };
    const r5 = fromR4Questionnaire(r4);
    expect(r5.item![0].type).toBe("coding");
    expect(r5.item![0].answerConstraint).toBe("optionsOrString");
  });

  it("passes through non-choice types unchanged", () => {
    const r4: R4Questionnaire = {
      resourceType: "Questionnaire",
      status: "active",
      item: [
        { linkId: "q1", type: "boolean" },
        { linkId: "q2", type: "string" },
        { linkId: "q3", type: "group", item: [{ linkId: "q3.1", type: "integer" }] },
      ],
    };
    const r5 = fromR4Questionnaire(r4);
    expect(r5.item![0].type).toBe("boolean");
    expect(r5.item![1].type).toBe("string");
    expect(r5.item![2].type).toBe("group");
    expect(r5.item![2].item![0].type).toBe("integer");
  });

  it("recursively converts nested items", () => {
    const r4: R4Questionnaire = {
      resourceType: "Questionnaire",
      status: "active",
      item: [
        {
          linkId: "g1",
          type: "group",
          item: [
            { linkId: "q1", type: "choice" },
            { linkId: "q2", type: "open-choice" },
          ],
        },
      ],
    };
    const r5 = fromR4Questionnaire(r4);
    expect(r5.item![0].item![0].type).toBe("coding");
    expect(r5.item![0].item![0].answerConstraint).toBeUndefined();
    expect(r5.item![0].item![1].type).toBe("coding");
    expect(r5.item![0].item![1].answerConstraint).toBe("optionsOrString");
  });
});

describe("fromR4QuestionnaireResponse", () => {
  it("sets questionnaire to empty string when absent", () => {
    const r4: R4QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
    };
    const r5 = fromR4QuestionnaireResponse(r4);
    expect(r5.questionnaire).toBe("");
  });

  it("preserves questionnaire when present", () => {
    const r4: R4QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      questionnaire: "Questionnaire/123",
    };
    const r5 = fromR4QuestionnaireResponse(r4);
    expect(r5.questionnaire).toBe("Questionnaire/123");
  });
});
