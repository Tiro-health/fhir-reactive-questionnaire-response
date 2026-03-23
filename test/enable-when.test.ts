import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../src/build/build.js";
import type { Questionnaire, QuestionnaireResponse } from "../src/model/types.js";

describe("enableWhen — equals operator", () => {
  const questionnaire: Questionnaire = {
    resourceType: "Questionnaire",
    id: "eq-test",
    status: "active",
    item: [
      { linkId: "gender", text: "Gender", type: "coding" },
      {
        linkId: "pregnant",
        text: "Are you pregnant?",
        type: "boolean",
        enableWhen: [
          {
            question: "gender",
            operator: "=",
            answerCoding: { system: "http://hl7.org/fhir/administrative-gender", code: "female" },
          },
        ],
      },
    ],
  };

  it("is disabled when answer does not match", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "gender", answer: [{ valueCoding: { system: "http://hl7.org/fhir/administrative-gender", code: "male" } }] },
        { linkId: "pregnant" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    expect(rqr.getItems("pregnant")[0].enabled).toBe(false);
  });

  it("is enabled when answer matches", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "gender", answer: [{ valueCoding: { system: "http://hl7.org/fhir/administrative-gender", code: "female" } }] },
        { linkId: "pregnant" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    expect(rqr.getItems("pregnant")[0].enabled).toBe(true);
  });

  it("reactively updates when referenced answer changes", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "gender", answer: [{ valueCoding: { system: "http://hl7.org/fhir/administrative-gender", code: "male" } }] },
        { linkId: "pregnant" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const [gender] = rqr.getItems("gender");
    const [pregnant] = rqr.getItems("pregnant");

    expect(pregnant.enabled).toBe(false);

    gender.setAnswer([{ valueCoding: { system: "http://hl7.org/fhir/administrative-gender", code: "female" } }]);

    expect(pregnant.enabled).toBe(true);
  });
});

describe("enableWhen — exists operator", () => {
  const questionnaire: Questionnaire = {
    resourceType: "Questionnaire",
    id: "exists-test",
    status: "active",
    item: [
      { linkId: "email", text: "Email", type: "string" },
      {
        linkId: "confirm-email",
        text: "Confirm email",
        type: "string",
        enableWhen: [
          { question: "email", operator: "exists", answerBoolean: true },
        ],
      },
    ],
  };

  it("is disabled when referenced question has no answer", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    expect(rqr.getItems("confirm-email")[0].enabled).toBe(false);
  });

  it("is enabled when referenced question has an answer", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "email", answer: [{ valueString: "a@b.com" }] },
        { linkId: "confirm-email" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    expect(rqr.getItems("confirm-email")[0].enabled).toBe(true);
  });

  it("supports answerBoolean: false (enabled when no answer)", () => {
    const q: Questionnaire = {
      resourceType: "Questionnaire",
      id: "not-exists",
      status: "active",
      item: [
        { linkId: "reason", text: "Reason", type: "string" },
        {
          linkId: "fallback",
          text: "Fallback",
          type: "string",
          enableWhen: [
            { question: "reason", operator: "exists", answerBoolean: false },
          ],
        },
      ],
    };

    const rqr = buildQuestionnaireResponse(q);
    expect(rqr.getItems("fallback")[0].enabled).toBe(true);

    rqr.getItems("reason")[0].setAnswer([{ valueString: "something" }]);
    expect(rqr.getItems("fallback")[0].enabled).toBe(false);
  });
});

describe("enableWhen — numeric operators", () => {
  const questionnaire: Questionnaire = {
    resourceType: "Questionnaire",
    id: "numeric-test",
    status: "active",
    item: [
      { linkId: "age", text: "Age", type: "integer" },
      {
        linkId: "senior-details",
        text: "Senior details",
        type: "group",
        enableWhen: [
          { question: "age", operator: ">=", answerInteger: 65 },
        ],
      },
    ],
  };

  it(">= is disabled when value is below threshold", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "age", answer: [{ valueInteger: 30 }] },
        { linkId: "senior-details" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    expect(rqr.getItems("senior-details")[0].enabled).toBe(false);
  });

  it(">= is enabled when value equals threshold", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "age", answer: [{ valueInteger: 65 }] },
        { linkId: "senior-details" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    expect(rqr.getItems("senior-details")[0].enabled).toBe(true);
  });

  it(">= is enabled when value exceeds threshold", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "age", answer: [{ valueInteger: 70 }] },
        { linkId: "senior-details" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    expect(rqr.getItems("senior-details")[0].enabled).toBe(true);
  });
});

describe("enableWhen — not-equals operator", () => {
  const questionnaire: Questionnaire = {
    resourceType: "Questionnaire",
    id: "neq-test",
    status: "active",
    item: [
      { linkId: "status", text: "Status", type: "string" },
      {
        linkId: "editable-section",
        text: "Editable section",
        type: "group",
        enableWhen: [
          { question: "status", operator: "!=", answerString: "final" },
        ],
      },
    ],
  };

  it("is enabled when value differs", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "status", answer: [{ valueString: "draft" }] },
        { linkId: "editable-section" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    expect(rqr.getItems("editable-section")[0].enabled).toBe(true);
  });

  it("is disabled when value matches", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "status", answer: [{ valueString: "final" }] },
        { linkId: "editable-section" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    expect(rqr.getItems("editable-section")[0].enabled).toBe(false);
  });
});

describe("enableWhen — boolean answer", () => {
  const questionnaire: Questionnaire = {
    resourceType: "Questionnaire",
    id: "bool-test",
    status: "active",
    item: [
      { linkId: "has-allergies", text: "Do you have allergies?", type: "boolean" },
      {
        linkId: "allergy-details",
        text: "Describe your allergies",
        type: "string",
        enableWhen: [
          { question: "has-allergies", operator: "=", answerBoolean: true },
        ],
      },
    ],
  };

  it("is disabled when boolean is false", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "has-allergies", answer: [{ valueBoolean: false }] },
        { linkId: "allergy-details" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    expect(rqr.getItems("allergy-details")[0].enabled).toBe(false);
  });

  it("is enabled when boolean is true", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "has-allergies", answer: [{ valueBoolean: true }] },
        { linkId: "allergy-details" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    expect(rqr.getItems("allergy-details")[0].enabled).toBe(true);
  });
});

describe("enableBehavior", () => {
  it("'all' requires every condition to be true (default)", () => {
    const questionnaire: Questionnaire = {
      resourceType: "Questionnaire",
      id: "all-test",
      status: "active",
      item: [
        { linkId: "age", text: "Age", type: "integer" },
        { linkId: "consent", text: "Consent", type: "boolean" },
        {
          linkId: "details",
          text: "Details",
          type: "group",
          enableBehavior: "all",
          enableWhen: [
            { question: "age", operator: ">=", answerInteger: 18 },
            { question: "consent", operator: "=", answerBoolean: true },
          ],
        },
      ],
    };

    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "age", answer: [{ valueInteger: 20 }] },
        { linkId: "consent", answer: [{ valueBoolean: false }] },
        { linkId: "details" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    // age passes but consent fails
    expect(rqr.getItems("details")[0].enabled).toBe(false);

    rqr.getItems("consent")[0].setAnswer([{ valueBoolean: true }]);
    expect(rqr.getItems("details")[0].enabled).toBe(true);
  });

  it("'any' requires at least one condition to be true", () => {
    const questionnaire: Questionnaire = {
      resourceType: "Questionnaire",
      id: "any-test",
      status: "active",
      item: [
        { linkId: "employed", text: "Employed", type: "boolean" },
        { linkId: "student", text: "Student", type: "boolean" },
        {
          linkId: "income-section",
          text: "Income",
          type: "group",
          enableBehavior: "any",
          enableWhen: [
            { question: "employed", operator: "=", answerBoolean: true },
            { question: "student", operator: "=", answerBoolean: true },
          ],
        },
      ],
    };

    const bothFalse: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "employed", answer: [{ valueBoolean: false }] },
        { linkId: "student", answer: [{ valueBoolean: false }] },
        { linkId: "income-section" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, bothFalse);
    expect(rqr.getItems("income-section")[0].enabled).toBe(false);

    rqr.getItems("student")[0].setAnswer([{ valueBoolean: true }]);
    expect(rqr.getItems("income-section")[0].enabled).toBe(true);
  });

  it("defaults to 'all' when enableBehavior is omitted", () => {
    const questionnaire: Questionnaire = {
      resourceType: "Questionnaire",
      id: "default-test",
      status: "active",
      item: [
        { linkId: "a", text: "A", type: "boolean" },
        { linkId: "b", text: "B", type: "boolean" },
        {
          linkId: "target",
          text: "Target",
          type: "string",
          enableWhen: [
            { question: "a", operator: "=", answerBoolean: true },
            { question: "b", operator: "=", answerBoolean: true },
          ],
        },
      ],
    };

    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "a", answer: [{ valueBoolean: true }] },
        { linkId: "b", answer: [{ valueBoolean: false }] },
        { linkId: "target" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    // only one of two passes → "all" means disabled
    expect(rqr.getItems("target")[0].enabled).toBe(false);
  });
});

describe("enableWhen — quantity comparison", () => {
  it("compares quantity values", () => {
    const questionnaire: Questionnaire = {
      resourceType: "Questionnaire",
      id: "qty-test",
      status: "active",
      item: [
        { linkId: "weight", text: "Weight", type: "quantity" },
        {
          linkId: "overweight-advice",
          text: "Advice",
          type: "display",
          enableWhen: [
            {
              question: "weight",
              operator: ">",
              answerQuantity: { value: 100, unit: "kg", system: "http://unitsofmeasure.org", code: "kg" },
            },
          ],
        },
      ],
    };

    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "weight", answer: [{ valueQuantity: { value: 85, unit: "kg" } }] },
        { linkId: "overweight-advice" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    expect(rqr.getItems("overweight-advice")[0].enabled).toBe(false);

    rqr.getItems("weight")[0].setAnswer([{ valueQuantity: { value: 105, unit: "kg" } }]);
    expect(rqr.getItems("overweight-advice")[0].enabled).toBe(true);
  });
});

describe("enableWhen — no answer on referenced question", () => {
  it("non-exists operators return false when no answer present", () => {
    const questionnaire: Questionnaire = {
      resourceType: "Questionnaire",
      id: "no-answer-test",
      status: "active",
      item: [
        { linkId: "name", text: "Name", type: "string" },
        {
          linkId: "greeting",
          text: "Greeting",
          type: "display",
          enableWhen: [
            { question: "name", operator: "=", answerString: "Alice" },
          ],
        },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire);
    expect(rqr.getItems("greeting")[0].enabled).toBe(false);
  });
});
