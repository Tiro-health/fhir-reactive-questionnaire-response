import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../src/build/build.js";
import type { Questionnaire } from "../src/model/types.js";

const questionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "submit-test",
  status: "active",
  item: [
    { linkId: "name", text: "Name", type: "string" },
    {
      linkId: "conditional",
      text: "Conditional field",
      type: "string",
      enableWhen: [
        { question: "name", operator: "exists", answerBoolean: true },
      ],
    },
    {
      linkId: "group",
      text: "Group",
      type: "group",
      item: [
        {
          linkId: "nested-conditional",
          text: "Nested conditional",
          type: "string",
          enableWhen: [
            { question: "name", operator: "exists", answerBoolean: true },
          ],
        },
        {
          linkId: "nested-always",
          text: "Always enabled",
          type: "string",
        },
      ],
    },
    {
      linkId: "readonly-field",
      text: "Read only",
      type: "string",
      readOnly: true,
    },
  ],
};

describe("reactive status", () => {
  it("has reactive status signal defaulting to in-progress", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    expect(rqr.status).toBe("in-progress");
  });

  it("allows status to be set", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    rqr.status = "completed";
    expect(rqr.status).toBe("completed");
  });

  it("reflects status in toFhir output", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    rqr.status = "amended";
    expect(rqr.toFhir().status).toBe("amended");
  });
});

describe("toFhir({ excludeDisabled })", () => {
  it("includes disabled items by default", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    // "conditional" is disabled (name has no answer)
    expect(rqr.getItems("conditional")[0].enabled).toBe(false);

    const fhir = rqr.toFhir();
    const linkIds = fhir.item?.map((i) => i.linkId) ?? [];
    expect(linkIds).toContain("conditional");
  });

  it("excludes disabled items when excludeDisabled is true", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    expect(rqr.getItems("conditional")[0].enabled).toBe(false);

    const fhir = rqr.toFhir({ excludeDisabled: true });
    const linkIds = fhir.item?.map((i) => i.linkId) ?? [];
    expect(linkIds).not.toContain("conditional");
    expect(linkIds).toContain("name");
  });

  it("excludes nested disabled items", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const fhir = rqr.toFhir({ excludeDisabled: true });

    const group = fhir.item?.find((i) => i.linkId === "group");
    const nestedIds = group?.item?.map((i) => i.linkId) ?? [];
    expect(nestedIds).not.toContain("nested-conditional");
    expect(nestedIds).toContain("nested-always");
  });

  it("includes conditional items when they become enabled", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [name] = rqr.getItems("name");
    name.setAnswer([{ valueString: "Alice" }]);

    expect(rqr.getItems("conditional")[0].enabled).toBe(true);

    const fhir = rqr.toFhir({ excludeDisabled: true });
    const linkIds = fhir.item?.map((i) => i.linkId) ?? [];
    expect(linkIds).toContain("conditional");
  });
});

describe("submit()", () => {
  it("sets status and returns filtered response", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [name] = rqr.getItems("name");
    name.setAnswer([{ valueString: "Alice" }]);

    const result = rqr.submit();

    expect(result.status).toBe("completed");
    expect(rqr.status).toBe("completed");
    expect(result.item?.map((i) => i.linkId)).toContain("conditional");
  });

  it("accepts custom status", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const result = rqr.submit("amended");
    expect(result.status).toBe("amended");
    expect(rqr.status).toBe("amended");
  });

  it("filters disabled items from submitted response", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const result = rqr.submit();

    const linkIds = result.item?.map((i) => i.linkId) ?? [];
    expect(linkIds).not.toContain("conditional");
  });
});

describe("read-only enforcement", () => {
  it("ignores setAnswer on readOnly items", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [ro] = rqr.getItems("readonly-field");
    expect(ro.readOnly).toBe(true);

    ro.setAnswer([{ valueString: "attempt" }]);
    expect(ro.answerValues).toEqual([]);
  });

  it("ignores addAnswer on readOnly items", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [ro] = rqr.getItems("readonly-field");

    ro.addAnswer({ valueString: "attempt" });
    expect(ro.answerValues).toEqual([]);
  });

  it("allows setAnswer on non-readOnly items", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [name] = rqr.getItems("name");
    expect(name.readOnly).toBe(false);

    name.setAnswer([{ valueString: "Alice" }]);
    expect(name.answerValues).toEqual([{ valueString: "Alice" }]);
  });
});
