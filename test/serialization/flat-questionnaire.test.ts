import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../../src/build/build.js";
import type { Questionnaire } from "../../src/model/types.js";

const questionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "flat-form",
  status: "active",
  item: [
    { linkId: "name", text: "Name", type: "string" },
    { linkId: "age", text: "Age", type: "integer" },
    { linkId: "active", text: "Active", type: "boolean" },
  ],
};

describe("flat questionnaire serialization", () => {
  it("serializes all filled fields", () => {
    const model = buildQuestionnaireResponse(questionnaire);

    const [name] = model.getItems("name");
    const [age] = model.getItems("age");
    const [active] = model.getItems("active");

    name.setAnswer([{ valueString: "Alice" }]);
    age.setAnswer([{ valueInteger: 30 }]);
    active.setAnswer([{ valueBoolean: true }]);

    const fhir = model.toFhir();

    expect(fhir.resourceType).toBe("QuestionnaireResponse");
    expect(fhir.item).toHaveLength(3);

    const nameItem = fhir.item!.find((i) => i.linkId === "name");
    expect(nameItem?.answer?.[0]?.valueString).toBe("Alice");

    const ageItem = fhir.item!.find((i) => i.linkId === "age");
    expect(ageItem?.answer?.[0]?.valueInteger).toBe(30);

    const activeItem = fhir.item!.find((i) => i.linkId === "active");
    expect(activeItem?.answer?.[0]?.valueBoolean).toBe(true);
  });

  it("serializes a partially filled form", () => {
    const model = buildQuestionnaireResponse(questionnaire);

    const [name] = model.getItems("name");
    name.setAnswer([{ valueString: "Bob" }]);

    const fhir = model.toFhir();
    const nameItem = fhir.item!.find((i) => i.linkId === "name");
    expect(nameItem?.answer?.[0]?.valueString).toBe("Bob");

    const ageItem = fhir.item!.find((i) => i.linkId === "age");
    expect(ageItem?.answer).toBeUndefined();
  });

  it("clears an answer after setting it", () => {
    const model = buildQuestionnaireResponse(questionnaire);

    const [name] = model.getItems("name");
    name.setAnswer([{ valueString: "Carol" }]);
    expect(name.answerValues).toEqual([{ valueString: "Carol" }]);

    name.setAnswer([]);

    const fhir = model.toFhir();
    const nameItem = fhir.item!.find((i) => i.linkId === "name");
    expect(nameItem?.answer).toBeUndefined();
  });
});
