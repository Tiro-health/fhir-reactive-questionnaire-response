import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../../src/build/build.js";
import type { Questionnaire } from "../../src/model/types.js";

const questionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "nested-groups",
  status: "active",
  item: [
    { linkId: "toggle", text: "Enable outer?", type: "boolean" },
    {
      linkId: "outer",
      text: "Outer group",
      type: "group",
      enableWhen: [
        { question: "toggle", operator: "=", answerBoolean: true },
      ],
      item: [
        {
          linkId: "inner",
          text: "Inner group",
          type: "group",
          enableWhen: [
            { question: "toggle", operator: "=", answerBoolean: true },
          ],
          item: [
            { linkId: "leaf", text: "Leaf item", type: "string" },
          ],
        },
      ],
    },
  ],
};

describe("nested groups with enableWhen", () => {
  it("outer and inner groups both start disabled, leaf stays enabled", () => {
    const model = buildQuestionnaireResponse(questionnaire);

    expect(model.getItems("outer")[0].enabled).toBe(false);
    expect(model.getItems("inner")[0].enabled).toBe(false);
    expect(model.getItems("leaf")[0].enabled).toBe(true);
  });

  it("enabling toggle enables both groups and leaf remains enabled", () => {
    const model = buildQuestionnaireResponse(questionnaire);
    const [toggle] = model.getItems("toggle");

    toggle.setAnswer([{ valueBoolean: true }]);

    expect(model.getItems("outer")[0].enabled).toBe(true);
    expect(model.getItems("inner")[0].enabled).toBe(true);
    expect(model.getItems("leaf")[0].enabled).toBe(true);
  });
});

const mixedQuestionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "mixed-nested",
  status: "active",
  item: [
    { linkId: "a", text: "Toggle A", type: "boolean" },
    { linkId: "b", text: "Toggle B", type: "boolean" },
    {
      linkId: "outer",
      text: "Outer group",
      type: "group",
      enableWhen: [{ question: "a", operator: "=", answerBoolean: true }],
      item: [
        {
          linkId: "inner",
          text: "Inner group",
          type: "group",
          enableWhen: [{ question: "b", operator: "=", answerBoolean: true }],
          item: [
            { linkId: "leaf", text: "Leaf", type: "string" },
          ],
        },
      ],
    },
  ],
};

describe("nested groups with independent conditions", () => {
  it("inner group can be enabled while outer group is disabled", () => {
    const model = buildQuestionnaireResponse(mixedQuestionnaire);
    const [b] = model.getItems("b");

    b.setAnswer([{ valueBoolean: true }]);

    // Outer disabled (A is false), but inner enabled (B is true) — no cascade
    expect(model.getItems("outer")[0].enabled).toBe(false);
    expect(model.getItems("inner")[0].enabled).toBe(true);
  });

  it("outer enabled but inner disabled when only A is true", () => {
    const model = buildQuestionnaireResponse(mixedQuestionnaire);
    const [a] = model.getItems("a");

    a.setAnswer([{ valueBoolean: true }]);

    expect(model.getItems("outer")[0].enabled).toBe(true);
    expect(model.getItems("inner")[0].enabled).toBe(false);
  });

  it("both enabled when A and B are true", () => {
    const model = buildQuestionnaireResponse(mixedQuestionnaire);
    const [a] = model.getItems("a");
    const [b] = model.getItems("b");

    a.setAnswer([{ valueBoolean: true }]);
    b.setAnswer([{ valueBoolean: true }]);

    expect(model.getItems("outer")[0].enabled).toBe(true);
    expect(model.getItems("inner")[0].enabled).toBe(true);
    expect(model.getItems("leaf")[0].enabled).toBe(true);
  });
});
