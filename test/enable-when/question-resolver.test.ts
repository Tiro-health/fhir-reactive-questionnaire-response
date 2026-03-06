import { describe, it, expect } from "vitest";
import { evaluateEnableWhen } from "../../src/build/enable-when.js";
import type { AnswerValue, EnableWhen } from "../../src/model/types.js";

const answers =
  (map: Record<string, AnswerValue[] | null>) =>
  (linkId: string): AnswerValue[] | null =>
    map[linkId] ?? null;

describe("question resolution", () => {
  it("returns false when getAnswers returns null (linkId not found)", () => {
    const result = evaluateEnableWhen(
      [{ question: "q1", operator: "=", answerBoolean: true }],
      "all",
      answers({}),
    );
    expect(result).toBe(false);
  });

  it("returns false when getAnswers returns [] (item exists, no answers)", () => {
    const result = evaluateEnableWhen(
      [{ question: "q1", operator: "=", answerBoolean: true }],
      "all",
      answers({ q1: [] }),
    );
    expect(result).toBe(false);
  });

  it("exists false + null → true (item does not exist)", () => {
    const result = evaluateEnableWhen(
      [{ question: "q1", operator: "exists", answerBoolean: false }],
      "all",
      answers({}),
    );
    expect(result).toBe(true);
  });

  it("exists true + [] → false (item exists but no answers)", () => {
    const result = evaluateEnableWhen(
      [{ question: "q1", operator: "exists", answerBoolean: true }],
      "all",
      answers({ q1: [] }),
    );
    expect(result).toBe(false);
  });

  it("evaluates condition against returned answers", () => {
    const result = evaluateEnableWhen(
      [{ question: "q1", operator: "=", answerInteger: 42 }],
      "all",
      answers({ q1: [{ valueInteger: 42 }] }),
    );
    expect(result).toBe(true);
  });

  it("passes if any answer in a multi-answer array matches", () => {
    const result = evaluateEnableWhen(
      [{ question: "q1", operator: "=", answerString: "yes" }],
      "all",
      answers({
        q1: [
          { valueString: "no" },
          { valueString: "yes" },
          { valueString: "maybe" },
        ],
      }),
    );
    expect(result).toBe(true);
  });

  it("fails if no answer in a multi-answer array matches", () => {
    const result = evaluateEnableWhen(
      [{ question: "q1", operator: "=", answerString: "yes" }],
      "all",
      answers({
        q1: [{ valueString: "no" }, { valueString: "maybe" }],
      }),
    );
    expect(result).toBe(false);
  });

  it("!= returns true when at least one answer differs from condition", () => {
    const result = evaluateEnableWhen(
      [{ question: "q1", operator: "!=", answerString: "yes" }],
      "all",
      answers({ q1: [{ valueString: "no" }, { valueString: "yes" }] }),
    );
    expect(result).toBe(true);
  });

  it("!= returns false only when all answers match the condition", () => {
    const result = evaluateEnableWhen(
      [{ question: "q1", operator: "!=", answerString: "yes" }],
      "all",
      answers({ q1: [{ valueString: "yes" }, { valueString: "yes" }] }),
    );
    expect(result).toBe(false);
  });
});
