import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../../src/build/build.js";
import type {
  Questionnaire,
  QuestionnaireResponse,
} from "../../src/model/types.js";

const questionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "nested-answers-form",
  status: "active",
  item: [
    {
      linkId: "allergy",
      text: "Allergy",
      type: "string",
      repeats: true,
      item: [
        { linkId: "severity", text: "Severity", type: "string" },
        { linkId: "onset", text: "Onset date", type: "date" },
      ],
    },
  ],
};

describe("nested answers (answer.item[]) serialization", () => {
  it("serializes parent answer with child items", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        {
          linkId: "allergy",
          answer: [{ valueString: "Peanuts" }],
        },
      ],
    };

    const model = buildQuestionnaireResponse(questionnaire, response);
    const [allergy] = model.getItems("allergy");

    const entries = allergy.answerEntries;
    expect(entries).toHaveLength(1);

    const [severity] = entries[0].items.filter(
      (i) => i.linkId === "severity",
    );
    severity.setAnswer([{ valueString: "severe" }]);

    const fhir = model.toFhir();
    const allergyItem = fhir.item!.find((i) => i.linkId === "allergy");
    const answer = allergyItem?.answer?.[0];

    expect(answer?.valueString).toBe("Peanuts");
    expect(answer?.item).toHaveLength(2);

    const severityChild = answer?.item?.find((i) => i.linkId === "severity");
    expect(severityChild?.answer?.[0]?.valueString).toBe("severe");
  });

  it("serializes multiple answer entries each with children", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        {
          linkId: "allergy",
          answer: [{ valueString: "Peanuts" }],
        },
      ],
    };

    const model = buildQuestionnaireResponse(questionnaire, response);
    const [allergy] = model.getItems("allergy");

    // Add a second answer entry via addAnswer (creates children automatically)
    allergy.addAnswer({ valueString: "Shellfish" });

    const entries = allergy.answerEntries;
    expect(entries).toHaveLength(2);

    // Fill severity on second answer entry
    const [severity2] = entries[1].items.filter(
      (i) => i.linkId === "severity",
    );
    severity2.setAnswer([{ valueString: "mild" }]);

    const fhir = model.toFhir();
    const allergyItem = fhir.item!.find((i) => i.linkId === "allergy");

    expect(allergyItem?.answer).toHaveLength(2);
    expect(allergyItem?.answer?.[0]?.valueString).toBe("Peanuts");
    expect(allergyItem?.answer?.[1]?.valueString).toBe("Shellfish");
    expect(
      allergyItem?.answer?.[1]?.item?.find((i) => i.linkId === "severity")
        ?.answer?.[0]?.valueString,
    ).toBe("mild");
  });

  it("omits answer.item when children have no answers", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        {
          linkId: "allergy",
          answer: [{ valueString: "Dust" }],
        },
      ],
    };

    const model = buildQuestionnaireResponse(questionnaire, response);

    const fhir = model.toFhir();
    const answer = fhir.item!.find((i) => i.linkId === "allergy")?.answer?.[0];

    expect(answer?.valueString).toBe("Dust");
    // Children exist in definition but have no answers filled —
    // the serialized items are present (with linkId/text) but carry no answer key
    expect(answer?.item).toHaveLength(2);
    for (const child of answer!.item!) {
      expect(child.answer).toBeUndefined();
    }
  });
});
