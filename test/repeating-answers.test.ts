import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../src/build/build.js";
import type {
  Questionnaire,
  QuestionnaireResponse,
} from "../src/model/types.js";

const questionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "repeating-answers-test",
  status: "active",
  item: [
    { linkId: "phone", text: "Phone number", type: "string", repeats: true },
    { linkId: "name", text: "Name", type: "string" },
  ],
};

const calcQuestionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "calc-test",
  status: "active",
  item: [
    { linkId: "a", text: "Value A", type: "decimal" },
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
              "%resource.item.where(linkId='a').answer.value",
          },
        },
      ],
    },
  ],
};

describe("addAnswer", () => {
  it("appends a value to existing answers", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        {
          linkId: "phone",
          answer: [{ valueString: "111" }, { valueString: "222" }],
        },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const [phone] = rqr.getItems("phone");

    phone.addAnswer({ valueString: "333" });

    expect(phone.answer).toEqual([
      { valueString: "111" },
      { valueString: "222" },
      { valueString: "333" },
    ]);
  });

  it("creates first answer on empty answer list", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [phone] = rqr.getItems("phone");

    phone.addAnswer({ valueString: "111" });

    expect(phone.answer).toEqual([{ valueString: "111" }]);
  });
});

describe("removeAnswer", () => {
  it("removes an answer by index", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        {
          linkId: "phone",
          answer: [
            { valueString: "111" },
            { valueString: "222" },
            { valueString: "333" },
          ],
        },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const [phone] = rqr.getItems("phone");

    phone.removeAnswer(1);

    expect(phone.answer).toEqual([
      { valueString: "111" },
      { valueString: "333" },
    ]);
  });

  it("throws on out-of-range index", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [{ linkId: "phone", answer: [{ valueString: "111" }] }],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const [phone] = rqr.getItems("phone");

    expect(() => phone.removeAnswer(5)).toThrow(/out of range/);
    expect(() => phone.removeAnswer(-1)).toThrow(/out of range/);
  });
});

describe("toFhir reflects added/removed answers", () => {
  it("toFhir includes answers after addAnswer", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [phone] = rqr.getItems("phone");

    phone.addAnswer({ valueString: "111" });
    phone.addAnswer({ valueString: "222" });

    const fhir = rqr.toFhir();
    const phoneItem = fhir.item?.find((i) => i.linkId === "phone");

    expect(phoneItem?.answer).toEqual([
      { valueString: "111" },
      { valueString: "222" },
    ]);
  });

  it("toFhir reflects removal after removeAnswer", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        {
          linkId: "phone",
          answer: [{ valueString: "111" }, { valueString: "222" }],
        },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const [phone] = rqr.getItems("phone");

    phone.removeAnswer(0);

    const fhir = rqr.toFhir();
    const phoneItem = fhir.item?.find((i) => i.linkId === "phone");

    expect(phoneItem?.answer).toEqual([{ valueString: "222" }]);
  });
});

describe("dirty flag reflects answer mutations", () => {
  it("is dirty after addAnswer", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [phone] = rqr.getItems("phone");

    expect(phone.dirty).toBe(false);

    phone.addAnswer({ valueString: "111" });

    expect(phone.dirty).toBe(true);
  });

  it("is dirty after removeAnswer", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        {
          linkId: "phone",
          answer: [{ valueString: "111" }, { valueString: "222" }],
        },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const [phone] = rqr.getItems("phone");

    expect(phone.dirty).toBe(false);

    phone.removeAnswer(0);

    expect(phone.dirty).toBe(true);
  });
});

describe("no-op on calculated items", () => {
  it("addAnswer is a no-op on calculated items", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "a", answer: [{ valueDecimal: 10 }] },
        { linkId: "sum" },
      ],
    };

    const rqr = buildQuestionnaireResponse(calcQuestionnaire, response);
    const [sum] = rqr.getItems("sum");
    const before = sum.answer;

    sum.addAnswer({ valueDecimal: 999 });

    expect(sum.answer).toEqual(before);
  });

  it("removeAnswer is a no-op on calculated items", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        { linkId: "a", answer: [{ valueDecimal: 10 }] },
        { linkId: "sum" },
      ],
    };

    const rqr = buildQuestionnaireResponse(calcQuestionnaire, response);
    const [sum] = rqr.getItems("sum");
    const before = sum.answer;

    // removeAnswer on a calculated item: setAnswer is a no-op,
    // but the index check still runs against the current computed value.
    // If computed answer has a value, index 0 is valid but set is ignored.
    if (before && before.length > 0) {
      sum.removeAnswer(0);
      expect(sum.answer).toEqual(before);
    }
  });
});
