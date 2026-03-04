import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../src/build/build.js";
import type { Questionnaire, QuestionnaireResponse } from "../src/model/types.js";

const questionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "form-state-test",
  status: "active",
  item: [
    { linkId: "name", text: "Name", type: "string" },
    { linkId: "age", text: "Age", type: "integer" },
  ],
};

describe("dirty", () => {
  it("is false when answer has not changed", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "name", answer: [{ valueString: "Alice" }] },
        { linkId: "age" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const [name] = rqr.getItems("name");
    const [age] = rqr.getItems("age");

    expect(name.dirty).toBe(false);
    expect(age.dirty).toBe(false);
  });

  it("is true when answer changes from initial value", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "name", answer: [{ valueString: "Alice" }] },
        { linkId: "age" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const [name] = rqr.getItems("name");

    name.setAnswer([{ valueString: "Bob" }]);

    expect(name.dirty).toBe(true);
  });

  it("reverts to false when answer is set back to initial", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "name", answer: [{ valueString: "Alice" }] },
        { linkId: "age" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const [name] = rqr.getItems("name");

    name.setAnswer([{ valueString: "Bob" }]);
    expect(name.dirty).toBe(true);

    name.setAnswer([{ valueString: "Alice" }]);
    expect(name.dirty).toBe(false);
  });

  it("is true when empty item gets an answer", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [age] = rqr.getItems("age");

    expect(age.dirty).toBe(false);

    age.setAnswer([{ valueInteger: 30 }]);
    expect(age.dirty).toBe(true);
  });
});

describe("touched", () => {
  it("is false by default", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [name] = rqr.getItems("name");

    expect(name.touched).toBe(false);
  });

  it("is true after markTouched()", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [name] = rqr.getItems("name");

    name.markTouched();

    expect(name.touched).toBe(true);
  });

  it("stays true once marked", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [name] = rqr.getItems("name");

    name.markTouched();
    name.markTouched();

    expect(name.touched).toBe(true);
  });
});

describe("dirty and touched do not affect toFhir()", () => {
  it("toFhir() excludes dirty and touched state", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "name", answer: [{ valueString: "Alice" }] },
        { linkId: "age" },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const [name] = rqr.getItems("name");

    name.setAnswer([{ valueString: "Bob" }]);
    name.markTouched();

    const fhir = rqr.toFhir();
    const nameItem = fhir.item?.find((i) => i.linkId === "name");

    expect(nameItem).toEqual({
      linkId: "name",
      text: "Name",
      answer: [{ valueString: "Bob" }],
    });
    expect(nameItem).not.toHaveProperty("dirty");
    expect(nameItem).not.toHaveProperty("touched");
  });
});
