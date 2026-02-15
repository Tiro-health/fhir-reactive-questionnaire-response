import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../src/build/build.js";
import {
  bmiQuestionnaire,
  filledBmiResponse,
  emptyBmiResponse,
} from "./fixtures/bmi-questionnaire.js";

describe("BMI Calculator — full integration", () => {
  it("computes BMI from weight and height", () => {
    const rqr = buildQuestionnaireResponse(
      bmiQuestionnaire,
      filledBmiResponse,
    );
    const [bmi] = rqr.getItems("bmi");

    // BMI = 80 / (1.80)^2 ≈ 24.69
    const bmiVal = bmi.answer;
    expect(bmiVal).not.toBeNull();
    expect(bmiVal![0].valueDecimal).toBeCloseTo(24.69, 1);
  });

  it("derives BMI category from calculated BMI", () => {
    const rqr = buildQuestionnaireResponse(
      bmiQuestionnaire,
      filledBmiResponse,
    );
    const [category] = rqr.getItems("bmi-category");

    expect(category.answer).toEqual([{ valueString: "Normal" }]);
  });

  it("changing weight updates BMI and category", () => {
    const rqr = buildQuestionnaireResponse(
      bmiQuestionnaire,
      filledBmiResponse,
    );
    const [weight] = rqr.getItems("weight");
    const [bmi] = rqr.getItems("bmi");
    const [category] = rqr.getItems("bmi-category");

    weight.setAnswer([{ valueDecimal: 100 }]);

    // BMI = 100 / (1.80)^2 ≈ 30.86
    expect(bmi.answer![0].valueDecimal).toBeCloseTo(30.86, 1);
    expect(category.answer![0]).toEqual({ valueString: "Obese" });
  });

  it("changing height updates BMI", () => {
    const rqr = buildQuestionnaireResponse(
      bmiQuestionnaire,
      filledBmiResponse,
    );
    const [weight] = rqr.getItems("weight");
    const [height] = rqr.getItems("height");
    const [bmi] = rqr.getItems("bmi");
    const [category] = rqr.getItems("bmi-category");

    weight.setAnswer([{ valueDecimal: 100 }]);
    height.setAnswer([{ valueDecimal: 200 }]);

    // BMI = 100 / (2.00)^2 = 25
    expect(bmi.answer![0].valueDecimal).toBe(25);
    expect(category.answer![0]).toEqual({
      valueString: "Overweight",
    });
  });

  it("empty response produces no BMI", () => {
    const rqr = buildQuestionnaireResponse(
      bmiQuestionnaire,
      emptyBmiResponse,
    );
    const [bmi] = rqr.getItems("bmi");

    expect(bmi.answer).toBeNull();
  });

  it("toFhir() includes calculated answers", () => {
    const rqr = buildQuestionnaireResponse(
      bmiQuestionnaire,
      filledBmiResponse,
    );
    const fhir = rqr.toFhir();

    const bmiItem = fhir.item?.find((i) => i.linkId === "bmi");
    expect(bmiItem?.answer?.[0]?.valueDecimal).toBeCloseTo(24.69, 1);

    const catItem = fhir.item?.find((i) => i.linkId === "bmi-category");
    expect(catItem?.answer?.[0]?.valueString).toBe("Normal");
  });
});
