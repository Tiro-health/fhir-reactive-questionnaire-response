import { describe, it, expect } from "vitest";
import { evaluateEnableWhen } from "../../src/build/enable-when.js";
import type {
  AnswerValue,
  EnableWhen,
  EnableWhenOperator,
} from "../../src/model/types.js";

/** Evaluate a single condition with a single answer. */
function evalSingle(condition: EnableWhen, answer: AnswerValue | null): boolean {
  return evaluateEnableWhen(
    [condition],
    "all",
    () => (answer ? [answer] : []),
  );
}

// ---------------------------------------------------------------------------
// Ordered comparisons
// ---------------------------------------------------------------------------

describe("integer comparisons", () => {
  const cond = (op: EnableWhenOperator): EnableWhen => ({
    question: "q",
    operator: op,
    answerInteger: 10,
  });

  it("= true when equal", () => expect(evalSingle(cond("="), { valueInteger: 10 })).toBe(true));
  it("= false when not equal", () => expect(evalSingle(cond("="), { valueInteger: 5 })).toBe(false));
  it("!= true when not equal", () => expect(evalSingle(cond("!="), { valueInteger: 5 })).toBe(true));
  it("!= false when equal", () => expect(evalSingle(cond("!="), { valueInteger: 10 })).toBe(false));
  it("> true", () => expect(evalSingle(cond(">"), { valueInteger: 15 })).toBe(true));
  it("> false", () => expect(evalSingle(cond(">"), { valueInteger: 10 })).toBe(false));
  it("< true", () => expect(evalSingle(cond("<"), { valueInteger: 5 })).toBe(true));
  it("< false", () => expect(evalSingle(cond("<"), { valueInteger: 10 })).toBe(false));
  it(">= true when equal", () => expect(evalSingle(cond(">="), { valueInteger: 10 })).toBe(true));
  it(">= true when greater", () => expect(evalSingle(cond(">="), { valueInteger: 11 })).toBe(true));
  it(">= false", () => expect(evalSingle(cond(">="), { valueInteger: 9 })).toBe(false));
  it("<= true when equal", () => expect(evalSingle(cond("<="), { valueInteger: 10 })).toBe(true));
  it("<= true when less", () => expect(evalSingle(cond("<="), { valueInteger: 9 })).toBe(true));
  it("<= false", () => expect(evalSingle(cond("<="), { valueInteger: 11 })).toBe(false));
  it("returns false when actual is undefined", () => expect(evalSingle(cond("="), {})).toBe(false));
});

describe("decimal comparisons", () => {
  const cond = (op: EnableWhenOperator): EnableWhen => ({
    question: "q",
    operator: op,
    answerDecimal: 3.14,
  });

  it("= true", () => expect(evalSingle(cond("="), { valueDecimal: 3.14 })).toBe(true));
  it("= false", () => expect(evalSingle(cond("="), { valueDecimal: 2.71 })).toBe(false));
  it("!= true", () => expect(evalSingle(cond("!="), { valueDecimal: 2.71 })).toBe(true));
  it("> true", () => expect(evalSingle(cond(">"), { valueDecimal: 4.0 })).toBe(true));
  it("< true", () => expect(evalSingle(cond("<"), { valueDecimal: 2.0 })).toBe(true));
  it("returns false when actual is undefined", () => expect(evalSingle(cond("="), {})).toBe(false));
});

describe("boolean comparisons", () => {
  const cond = (op: EnableWhenOperator): EnableWhen => ({
    question: "q",
    operator: op,
    answerBoolean: true,
  });

  it("= true", () => expect(evalSingle(cond("="), { valueBoolean: true })).toBe(true));
  it("= false", () => expect(evalSingle(cond("="), { valueBoolean: false })).toBe(false));
  it("!= true", () => expect(evalSingle(cond("!="), { valueBoolean: false })).toBe(true));
  it("!= false", () => expect(evalSingle(cond("!="), { valueBoolean: true })).toBe(false));
  it("returns false when actual is undefined", () => expect(evalSingle(cond("="), {})).toBe(false));
});

describe("string comparisons", () => {
  const cond = (op: EnableWhenOperator): EnableWhen => ({
    question: "q",
    operator: op,
    answerString: "hello",
  });

  it("= true", () => expect(evalSingle(cond("="), { valueString: "hello" })).toBe(true));
  it("= false", () => expect(evalSingle(cond("="), { valueString: "world" })).toBe(false));
  it("!= true", () => expect(evalSingle(cond("!="), { valueString: "world" })).toBe(true));
  it("!= false", () => expect(evalSingle(cond("!="), { valueString: "hello" })).toBe(false));
  it("returns false when actual is undefined", () => expect(evalSingle(cond("="), {})).toBe(false));
});

describe("date comparisons", () => {
  const cond = (op: EnableWhenOperator): EnableWhen => ({
    question: "q",
    operator: op,
    answerDate: "2024-06-15",
  });

  it("= true", () => expect(evalSingle(cond("="), { valueDate: "2024-06-15" })).toBe(true));
  it("= false", () => expect(evalSingle(cond("="), { valueDate: "2024-01-01" })).toBe(false));
  it("!= true", () => expect(evalSingle(cond("!="), { valueDate: "2024-01-01" })).toBe(true));
  it("> true (lexicographic)", () => expect(evalSingle(cond(">"), { valueDate: "2024-12-31" })).toBe(true));
  it("< true (lexicographic)", () => expect(evalSingle(cond("<"), { valueDate: "2024-01-01" })).toBe(true));
  it("returns false when actual is undefined", () => expect(evalSingle(cond("="), {})).toBe(false));
});

describe("dateTime comparisons", () => {
  const cond = (op: EnableWhenOperator): EnableWhen => ({
    question: "q",
    operator: op,
    answerDateTime: "2024-06-15T10:00:00Z",
  });

  it("= true", () =>
    expect(evalSingle(cond("="), { valueDateTime: "2024-06-15T10:00:00Z" })).toBe(true));
  it("!= true", () =>
    expect(evalSingle(cond("!="), { valueDateTime: "2024-06-15T11:00:00Z" })).toBe(true));
});

describe("time comparisons", () => {
  const cond = (op: EnableWhenOperator): EnableWhen => ({
    question: "q",
    operator: op,
    answerTime: "14:30:00",
  });

  it("= true", () => expect(evalSingle(cond("="), { valueTime: "14:30:00" })).toBe(true));
  it("!= true", () => expect(evalSingle(cond("!="), { valueTime: "08:00:00" })).toBe(true));
});

// ---------------------------------------------------------------------------
// Coding comparisons
// ---------------------------------------------------------------------------

describe("coding comparisons", () => {
  it("= true when system and code match", () => {
    expect(
      evalSingle(
        { question: "q", operator: "=", answerCoding: { system: "http://loinc.org", code: "1234" } },
        { valueCoding: { system: "http://loinc.org", code: "1234" } },
      ),
    ).toBe(true);
  });

  it("= false when code matches but system differs", () => {
    expect(
      evalSingle(
        { question: "q", operator: "=", answerCoding: { system: "http://loinc.org", code: "1234" } },
        { valueCoding: { system: "http://snomed.info/sct", code: "1234" } },
      ),
    ).toBe(false);
  });

  it("= true when condition has no system (system-agnostic)", () => {
    expect(
      evalSingle(
        { question: "q", operator: "=", answerCoding: { code: "1234" } },
        { valueCoding: { system: "http://anything.org", code: "1234" } },
      ),
    ).toBe(true);
  });

  it("!= true when codes differ", () => {
    expect(
      evalSingle(
        { question: "q", operator: "!=", answerCoding: { system: "http://loinc.org", code: "1234" } },
        { valueCoding: { system: "http://loinc.org", code: "5678" } },
      ),
    ).toBe(true);
  });

  it("!= false when codes match", () => {
    expect(
      evalSingle(
        { question: "q", operator: "!=", answerCoding: { code: "1234" } },
        { valueCoding: { code: "1234" } },
      ),
    ).toBe(false);
  });

  it("> returns false (unsupported operator)", () => {
    expect(
      evalSingle(
        { question: "q", operator: ">", answerCoding: { code: "1234" } },
        { valueCoding: { code: "1234" } },
      ),
    ).toBe(false);
  });

  it("< returns false (unsupported operator)", () => {
    expect(
      evalSingle(
        { question: "q", operator: "<", answerCoding: { code: "1234" } },
        { valueCoding: { code: "5678" } },
      ),
    ).toBe(false);
  });

  it("returns false when actual coding is undefined", () => {
    expect(
      evalSingle(
        { question: "q", operator: "=", answerCoding: { code: "1234" } },
        {},
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Quantity comparisons
// ---------------------------------------------------------------------------

describe("quantity comparisons", () => {
  const cond = (op: EnableWhenOperator): EnableWhen => ({
    question: "q",
    operator: op,
    answerQuantity: { value: 100, unit: "kg" },
  });

  it("= true", () => expect(evalSingle(cond("="), { valueQuantity: { value: 100 } })).toBe(true));
  it("= false", () => expect(evalSingle(cond("="), { valueQuantity: { value: 50 } })).toBe(false));
  it("!= true", () => expect(evalSingle(cond("!="), { valueQuantity: { value: 50 } })).toBe(true));
  it("> true", () => expect(evalSingle(cond(">"), { valueQuantity: { value: 150 } })).toBe(true));
  it("< true", () => expect(evalSingle(cond("<"), { valueQuantity: { value: 50 } })).toBe(true));
  it(">= true", () => expect(evalSingle(cond(">="), { valueQuantity: { value: 100 } })).toBe(true));
  it("<= true", () => expect(evalSingle(cond("<="), { valueQuantity: { value: 100 } })).toBe(true));

  it("returns false when actual.value is undefined", () => {
    expect(evalSingle(cond("="), { valueQuantity: { unit: "kg" } })).toBe(false);
  });

  it("returns false when expected.value is undefined", () => {
    expect(
      evalSingle(
        { question: "q", operator: "=", answerQuantity: { unit: "kg" } },
        { valueQuantity: { value: 100 } },
      ),
    ).toBe(false);
  });

  it("returns false when actual quantity is undefined", () => {
    expect(evalSingle(cond("="), {})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Exists operator
// ---------------------------------------------------------------------------

describe("exists operator", () => {
  it("answerBoolean true + has answer → true", () => {
    expect(
      evalSingle(
        { question: "q", operator: "exists", answerBoolean: true },
        { valueString: "anything" },
      ),
    ).toBe(true);
  });

  it("answerBoolean true + no answer → false", () => {
    expect(
      evalSingle(
        { question: "q", operator: "exists", answerBoolean: true },
        null,
      ),
    ).toBe(false);
  });

  it("answerBoolean false + has answer → false", () => {
    expect(
      evalSingle(
        { question: "q", operator: "exists", answerBoolean: false },
        { valueString: "anything" },
      ),
    ).toBe(false);
  });

  it("answerBoolean false + no answer → true", () => {
    expect(
      evalSingle(
        { question: "q", operator: "exists", answerBoolean: false },
        null,
      ),
    ).toBe(true);
  });

  it("answerBoolean omitted defaults to true", () => {
    expect(
      evalSingle(
        { question: "q", operator: "exists" } as EnableWhen,
        { valueString: "anything" },
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Edge case: no answer* property on condition
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  it("returns false when condition has no answer* property", () => {
    expect(
      evalSingle(
        { question: "q", operator: "=" } as EnableWhen,
        { valueString: "anything" },
      ),
    ).toBe(false);
  });
});
