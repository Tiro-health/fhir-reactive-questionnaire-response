import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../src/build/build.js";
import { evaluateFhirPath } from "../src/build/fhirpath-context.js";
import type { Questionnaire, QuestionnaireResponse } from "../src/model/types.js";

describe("FHIRPath evaluation", () => {
  it("evaluates simple arithmetic", () => {
    const resource: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
    };
    const result = evaluateFhirPath("2 + 3", resource);
    expect(result).toEqual([5]);
  });

  it("evaluates item reference", () => {
    const resource: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [{ linkId: "x", answer: [{ valueDecimal: 42 }] }],
    };
    const result = evaluateFhirPath(
      "%resource.item.where(linkId='x').answer.value",
      resource,
    );
    expect(result).toEqual([42]);
  });

  it("handles missing answers gracefully", () => {
    const resource: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [{ linkId: "x" }],
    };
    const result = evaluateFhirPath(
      "%resource.item.where(linkId='x').answer.value",
      resource,
    );
    expect(result).toEqual([]);
  });
});

describe("Calculated expression via signals", () => {
  const calcQuestionnaire: Questionnaire = {
    resourceType: "Questionnaire",
    id: "calc-test",
    status: "active",
    item: [
      { linkId: "a", text: "Value A", type: "decimal" },
      { linkId: "b", text: "Value B", type: "decimal" },
      {
        linkId: "sum",
        text: "Sum",
        type: "decimal",
        readOnly: true,
        extension: [
          {
            url: "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression",
            valueExpression: {
              language: "text/fhirpath",
              expression:
                "%resource.item.where(linkId='a').answer.value + %resource.item.where(linkId='b').answer.value",
            },
          },
        ],
      },
    ],
  };

  it("calculated expression produces computed value on construction", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "a", answer: [{ valueDecimal: 10 }] },
        { linkId: "b", answer: [{ valueDecimal: 20 }] },
        { linkId: "sum" },
      ],
    };

    const rqr = buildQuestionnaireResponse(calcQuestionnaire, response);
    const [sumItem] = rqr.getItems("sum");

    expect(sumItem.answerValues).toEqual([{ valueDecimal: 30 }]);
  });

  it("calculated expression updates when inputs change", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "a", answer: [{ valueDecimal: 10 }] },
        { linkId: "b", answer: [{ valueDecimal: 20 }] },
        { linkId: "sum" },
      ],
    };

    const rqr = buildQuestionnaireResponse(calcQuestionnaire, response);
    const [a] = rqr.getItems("a");
    const [sumItem] = rqr.getItems("sum");

    a.setAnswer([{ valueDecimal: 50 }]);

    expect(sumItem.answerValues).toEqual([{ valueDecimal: 70 }]);
  });

  it("calculated expression returns null for missing inputs", () => {
    const rqr = buildQuestionnaireResponse(calcQuestionnaire);
    const [sumItem] = rqr.getItems("sum");

    expect(sumItem.answerValues).toBeNull();
  });
});

describe("Repeating items", () => {
  const repeatingQuestionnaire: Questionnaire = {
    resourceType: "Questionnaire",
    id: "repeating-test",
    status: "active",
    item: [
      { linkId: "phone", text: "Phone number", type: "string", repeats: true },
    ],
  };

  it("hydrates multiple response items for same linkId", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { id: "phone-1", linkId: "phone", answer: [{ valueString: "111" }] },
        { id: "phone-2", linkId: "phone", answer: [{ valueString: "222" }] },
        { id: "phone-3", linkId: "phone", answer: [{ valueString: "333" }] },
      ],
    };

    const rqr = buildQuestionnaireResponse(repeatingQuestionnaire, response);

    const phones = rqr.getItems("phone");
    expect(phones).toHaveLength(3);
    expect(phones[0].answerValues).toEqual([{ valueString: "111" }]);
    expect(phones[1].answerValues).toEqual([{ valueString: "222" }]);
    expect(phones[2].answerValues).toEqual([{ valueString: "333" }]);
  });

  it("preserves item ids", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { id: "phone-1", linkId: "phone", answer: [{ valueString: "111" }] },
        { id: "phone-2", linkId: "phone", answer: [{ valueString: "222" }] },
      ],
    };

    const rqr = buildQuestionnaireResponse(repeatingQuestionnaire, response);

    expect(rqr.getItemById("phone-1")?.answerValues).toEqual([{ valueString: "111" }]);
    expect(rqr.getItemById("phone-2")?.answerValues).toEqual([{ valueString: "222" }]);
  });

  it("toFhir() serializes all repeating instances", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { id: "p1", linkId: "phone", answer: [{ valueString: "111" }] },
        { id: "p2", linkId: "phone", answer: [{ valueString: "222" }] },
      ],
    };

    const rqr = buildQuestionnaireResponse(repeatingQuestionnaire, response);
    const fhir = rqr.toFhir();

    const phoneItems = fhir.item?.filter((i) => i.linkId === "phone") ?? [];
    expect(phoneItems).toHaveLength(2);
    expect(phoneItems[0].id).toBe("p1");
    expect(phoneItems[1].id).toBe("p2");
  });

  it("creates one empty instance when no response items match", () => {
    const rqr = buildQuestionnaireResponse(repeatingQuestionnaire);

    const phones = rqr.getItems("phone");
    expect(phones).toHaveLength(1);
    expect(phones[0].answerValues).toEqual([]);
  });
});
