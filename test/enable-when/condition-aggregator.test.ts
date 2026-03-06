import { describe, it, expect } from "vitest";
import { evaluateEnableWhen } from "../../src/build/enable-when.js";
import type { AnswerValue, EnableWhen } from "../../src/model/types.js";

const answers =
  (map: Record<string, AnswerValue[] | null>) =>
  (linkId: string): AnswerValue[] | null =>
    map[linkId] ?? null;

const trueCondition: EnableWhen = {
  question: "q1",
  operator: "=",
  answerBoolean: true,
};

const falseCondition: EnableWhen = {
  question: "q2",
  operator: "=",
  answerBoolean: true,
};

const resolver = answers({
  q1: [{ valueBoolean: true }],
  q2: [{ valueBoolean: false }],
});

describe("enableBehavior aggregation", () => {
  describe("all", () => {
    it("true when all conditions are true", () => {
      expect(
        evaluateEnableWhen([trueCondition, trueCondition], "all", resolver),
      ).toBe(true);
    });

    it("false when one condition is false", () => {
      expect(
        evaluateEnableWhen([trueCondition, falseCondition], "all", resolver),
      ).toBe(false);
    });
  });

  describe("any", () => {
    it("false when all conditions are false", () => {
      expect(
        evaluateEnableWhen([falseCondition, falseCondition], "any", resolver),
      ).toBe(false);
    });

    it("true when one condition is true", () => {
      expect(
        evaluateEnableWhen([trueCondition, falseCondition], "any", resolver),
      ).toBe(true);
    });

    it("true when all conditions are true", () => {
      expect(
        evaluateEnableWhen([trueCondition, trueCondition], "any", resolver),
      ).toBe(true);
    });
  });

  describe("single condition", () => {
    it("all and any behave the same for a single true condition", () => {
      const all = evaluateEnableWhen([trueCondition], "all", resolver);
      const any = evaluateEnableWhen([trueCondition], "any", resolver);
      expect(all).toBe(true);
      expect(any).toBe(true);
    });

    it("all and any behave the same for a single false condition", () => {
      const all = evaluateEnableWhen([falseCondition], "all", resolver);
      const any = evaluateEnableWhen([falseCondition], "any", resolver);
      expect(all).toBe(false);
      expect(any).toBe(false);
    });
  });
});
