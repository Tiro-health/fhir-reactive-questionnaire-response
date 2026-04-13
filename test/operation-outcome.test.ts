import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../src/build/build.js";
import type {
  OperationOutcome,
  Questionnaire,
} from "../src/model/types.js";

const questionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "oo-test",
  status: "active",
  item: [
    { linkId: "name", text: "Name", type: "string" },
    {
      linkId: "group",
      text: "Group",
      type: "group",
      item: [
        { linkId: "age", text: "Age", type: "integer" },
        { linkId: "email", text: "Email", type: "string" },
      ],
    },
    { linkId: "notes", text: "Notes", type: "text" },
  ],
};

function makeOutcome(
  ...issues: OperationOutcome["issue"]
): OperationOutcome {
  return {
    resourceType: "OperationOutcome",
    issue: issues.flat(),
  };
}

describe("applyOutcome", () => {
  it("routes issue to correct root item by expression", () => {
    const model = buildQuestionnaireResponse(questionnaire);
    const name = model.getItems("name")[0];

    model.applyOutcome(
      makeOutcome({
        severity: "error",
        code: "required",
        diagnostics: "Name is required",
        expression: ["QuestionnaireResponse.item[0]"],
      }),
    );

    expect(name.issues).toHaveLength(1);
    expect(name.issues[0].code).toBe("required");
  });

  it("routes issue to nested child item", () => {
    const model = buildQuestionnaireResponse(questionnaire);
    const age = model.getItems("age")[0];

    model.applyOutcome(
      makeOutcome({
        severity: "error",
        code: "value",
        diagnostics: "Age must be positive",
        expression: ["QuestionnaireResponse.item[1].item[0]"],
      }),
    );

    expect(age.issues).toHaveLength(1);
    expect(age.issues[0].diagnostics).toBe("Age must be positive");
  });

  it("routes answer-level expression to owning item", () => {
    const model = buildQuestionnaireResponse(questionnaire);
    const name = model.getItems("name")[0];

    model.applyOutcome(
      makeOutcome({
        severity: "warning",
        code: "value",
        diagnostics: "Name is suspicious",
        expression: ["QuestionnaireResponse.item[0].answer[0]"],
      }),
    );

    expect(name.issues).toHaveLength(1);
    expect(name.issues[0].severity).toBe("warning");
  });

  it("clears issues on items not mentioned in new outcome", () => {
    const model = buildQuestionnaireResponse(questionnaire);
    const name = model.getItems("name")[0];
    const notes = model.getItems("notes")[0];

    // First outcome: issues on both items
    model.applyOutcome(
      makeOutcome(
        {
          severity: "error",
          code: "required",
          expression: ["QuestionnaireResponse.item[0]"],
        },
        {
          severity: "error",
          code: "required",
          expression: ["QuestionnaireResponse.item[2]"],
        },
      ),
    );
    expect(name.issues).toHaveLength(1);
    expect(notes.issues).toHaveLength(1);

    // Second outcome: only name has issues
    model.applyOutcome(
      makeOutcome({
        severity: "error",
        code: "required",
        expression: ["QuestionnaireResponse.item[0]"],
      }),
    );
    expect(name.issues).toHaveLength(1);
    expect(notes.issues).toHaveLength(0);
  });

  it("replaces all previous issues on second applyOutcome", () => {
    const model = buildQuestionnaireResponse(questionnaire);
    const name = model.getItems("name")[0];

    model.applyOutcome(
      makeOutcome({
        severity: "error",
        code: "required",
        expression: ["QuestionnaireResponse.item[0]"],
      }),
    );
    expect(name.issues).toHaveLength(1);

    model.applyOutcome(
      makeOutcome(
        {
          severity: "error",
          code: "required",
          expression: ["QuestionnaireResponse.item[0]"],
        },
        {
          severity: "warning",
          code: "value",
          expression: ["QuestionnaireResponse.item[0]"],
        },
      ),
    );
    expect(name.issues).toHaveLength(2);
  });

  it("puts issues with no expression in unroutableIssues", () => {
    const model = buildQuestionnaireResponse(questionnaire);

    model.applyOutcome(
      makeOutcome({
        severity: "error",
        code: "business-rule",
        diagnostics: "Form-level validation error",
      }),
    );

    expect(model.unroutableIssues).toHaveLength(1);
    expect(model.unroutableIssues[0].code).toBe("business-rule");
  });

  it("puts issues with unparseable expressions in unroutableIssues", () => {
    const model = buildQuestionnaireResponse(questionnaire);

    model.applyOutcome(
      makeOutcome({
        severity: "error",
        code: "invalid",
        expression: ["Bundle.entry[0].resource"],
      }),
    );

    expect(model.unroutableIssues).toHaveLength(1);
  });

  it("puts issues with out-of-bounds indices in unroutableIssues", () => {
    const model = buildQuestionnaireResponse(questionnaire);

    model.applyOutcome(
      makeOutcome({
        severity: "error",
        code: "invalid",
        expression: ["QuestionnaireResponse.item[99]"],
      }),
    );

    expect(model.unroutableIssues).toHaveLength(1);
  });

  it("clears unroutableIssues on new applyOutcome", () => {
    const model = buildQuestionnaireResponse(questionnaire);

    model.applyOutcome(
      makeOutcome({
        severity: "error",
        code: "business-rule",
        diagnostics: "Bad",
      }),
    );
    expect(model.unroutableIssues).toHaveLength(1);

    model.applyOutcome(makeOutcome());
    expect(model.unroutableIssues).toHaveLength(0);
  });
});

describe("valid", () => {
  it("returns true when no issues", () => {
    const model = buildQuestionnaireResponse(questionnaire);
    const name = model.getItems("name")[0];
    expect(name.valid).toBe(true);
  });

  it("returns false when item has error issues", () => {
    const model = buildQuestionnaireResponse(questionnaire);
    const name = model.getItems("name")[0];

    model.applyOutcome(
      makeOutcome({
        severity: "error",
        code: "required",
        expression: ["QuestionnaireResponse.item[0]"],
      }),
    );

    expect(name.valid).toBe(false);
  });

  it("returns false when item has fatal issues", () => {
    const model = buildQuestionnaireResponse(questionnaire);
    const name = model.getItems("name")[0];

    model.applyOutcome(
      makeOutcome({
        severity: "fatal",
        code: "exception",
        expression: ["QuestionnaireResponse.item[0]"],
      }),
    );

    expect(name.valid).toBe(false);
  });

  it("returns true when item only has warning issues", () => {
    const model = buildQuestionnaireResponse(questionnaire);
    const name = model.getItems("name")[0];

    model.applyOutcome(
      makeOutcome({
        severity: "warning",
        code: "value",
        expression: ["QuestionnaireResponse.item[0]"],
      }),
    );

    expect(name.valid).toBe(true);
  });

  it("returns true when item only has information issues", () => {
    const model = buildQuestionnaireResponse(questionnaire);
    const name = model.getItems("name")[0];

    model.applyOutcome(
      makeOutcome({
        severity: "information",
        code: "informational",
        expression: ["QuestionnaireResponse.item[0]"],
      }),
    );

    expect(name.valid).toBe(true);
  });
});
