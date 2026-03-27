import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../src/build/build.js";
import type { Questionnaire } from "../src/model/types.js";

const questionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "metadata-test",
  status: "active",
  item: [
    {
      linkId: "q1",
      text: "Required field",
      type: "string",
      required: true,
    },
    {
      linkId: "q2",
      text: "Read-only field",
      type: "string",
      readOnly: true,
    },
    {
      linkId: "q3",
      text: "Repeating field",
      type: "string",
      repeats: true,
    },
    {
      linkId: "q4",
      text: "Hidden when disabled",
      type: "string",
      disabledDisplay: "hidden",
    },
    {
      linkId: "q5",
      text: "Protected when disabled",
      type: "string",
      disabledDisplay: "protected",
    },
    {
      linkId: "q6",
      text: "Plain field",
      type: "string",
    },
  ],
};

describe("questionnaire metadata on ResponseItem", () => {
  const rqr = buildQuestionnaireResponse(questionnaire);

  it("exposes required", () => {
    expect(rqr.getItems("q1")[0].required).toBe(true);
    expect(rqr.getItems("q6")[0].required).toBe(false);
  });

  it("exposes readOnly", () => {
    expect(rqr.getItems("q2")[0].readOnly).toBe(true);
    expect(rqr.getItems("q6")[0].readOnly).toBe(false);
  });

  it("exposes repeats", () => {
    expect(rqr.getItems("q3")[0].repeats).toBe(true);
    expect(rqr.getItems("q6")[0].repeats).toBe(false);
  });

  it("exposes disabledDisplay", () => {
    expect(rqr.getItems("q4")[0].disabledDisplay).toBe("hidden");
    expect(rqr.getItems("q5")[0].disabledDisplay).toBe("protected");
    expect(rqr.getItems("q6")[0].disabledDisplay).toBeUndefined();
  });
});
