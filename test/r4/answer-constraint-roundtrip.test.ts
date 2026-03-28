import { describe, it, expect } from "vitest";
import { fromR4Questionnaire } from "../../src/r4/from-r4.js";
import { toR4Questionnaire } from "../../src/r4/to-r4.js";
import type { R4Questionnaire } from "../../src/r4/types.js";
import type { Questionnaire } from "../../src/model/types.js";

describe("answerConstraint round-trip: R4 → R5 → R4", () => {
  it("choice → coding → choice", () => {
    const r4: R4Questionnaire = {
      resourceType: "Questionnaire",
      status: "active",
      item: [{ linkId: "q1", type: "choice" }],
    };
    const roundTripped = toR4Questionnaire(fromR4Questionnaire(r4));
    expect(roundTripped).toEqual(r4);
    expect(roundTripped.item![0].type).toBe("choice");
  });

  it("open-choice → coding + optionsOrString → open-choice", () => {
    const r4: R4Questionnaire = {
      resourceType: "Questionnaire",
      status: "active",
      item: [{ linkId: "q1", type: "open-choice" }],
    };
    const r5 = fromR4Questionnaire(r4);
    expect(r5.item![0].type).toBe("coding");
    expect(r5.item![0].answerConstraint).toBe("optionsOrString");

    const roundTripped = toR4Questionnaire(r5);
    expect(roundTripped).toEqual(r4);
    expect(roundTripped.item![0].type).toBe("open-choice");
  });
});

describe("answerConstraint round-trip: R5 → R4 → R5", () => {
  it("coding + optionsOnly → choice → coding (no answerConstraint)", () => {
    const r5: Questionnaire = {
      resourceType: "Questionnaire",
      status: "active",
      item: [{ linkId: "q1", type: "coding", answerConstraint: "optionsOnly" }],
    };
    const roundTripped = fromR4Questionnaire(toR4Questionnaire(r5));
    expect(roundTripped.item![0].type).toBe("coding");
    // optionsOnly is the implicit default for coding, so it is not set explicitly
    // after round-trip. This is lossless in semantics but the field is absent.
    expect(roundTripped.item![0].answerConstraint).toBeUndefined();
  });

  it("coding + optionsOrString → open-choice → coding + optionsOrString", () => {
    const r5: Questionnaire = {
      resourceType: "Questionnaire",
      status: "active",
      item: [{ linkId: "q1", type: "coding", answerConstraint: "optionsOrString" }],
    };
    const roundTripped = fromR4Questionnaire(toR4Questionnaire(r5));
    expect(roundTripped.item![0].type).toBe("coding");
    expect(roundTripped.item![0].answerConstraint).toBe("optionsOrString");
  });

  it("coding + optionsOrType → open-choice → coding + optionsOrString (lossy)", () => {
    // optionsOrType has no R4 equivalent distinct from open-choice.
    // open-choice maps back to optionsOrString, so the round-trip is lossy:
    // optionsOrType becomes optionsOrString.
    const r5: Questionnaire = {
      resourceType: "Questionnaire",
      status: "active",
      item: [{ linkId: "q1", type: "coding", answerConstraint: "optionsOrType" }],
    };
    const r4 = toR4Questionnaire(r5);
    expect(r4.item![0].type).toBe("open-choice");

    const roundTripped = fromR4Questionnaire(r4);
    expect(roundTripped.item![0].type).toBe("coding");
    // Lossy: optionsOrType becomes optionsOrString after round-trip
    expect(roundTripped.item![0].answerConstraint).toBe("optionsOrString");
    expect(roundTripped.item![0].answerConstraint).not.toBe("optionsOrType");
  });

  it("coding (no constraint) → choice → coding (no constraint)", () => {
    const r5: Questionnaire = {
      resourceType: "Questionnaire",
      status: "active",
      item: [{ linkId: "q1", type: "coding" }],
    };
    const roundTripped = fromR4Questionnaire(toR4Questionnaire(r5));
    expect(roundTripped.item![0].type).toBe("coding");
    expect(roundTripped.item![0].answerConstraint).toBeUndefined();
  });
});
