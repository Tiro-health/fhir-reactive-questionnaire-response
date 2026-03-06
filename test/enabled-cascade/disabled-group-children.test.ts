import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../../src/build/build.js";
import type {
  Questionnaire,
  QuestionnaireResponse,
} from "../../src/model/types.js";

const questionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "disabled-group-children",
  status: "active",
  item: [
    { linkId: "toggle", text: "Enable group?", type: "boolean" },
    {
      linkId: "group",
      text: "Conditional group",
      type: "group",
      enableWhen: [
        { question: "toggle", operator: "=", answerBoolean: true },
      ],
      item: [
        { linkId: "child-a", text: "Child A", type: "string" },
        {
          linkId: "child-b",
          text: "Child B",
          type: "string",
          enableWhen: [
            { question: "toggle", operator: "=", answerBoolean: true },
          ],
        },
      ],
    },
  ],
};

describe("disabled group → children", () => {
  it("child without enableWhen stays enabled when parent group is disabled", () => {
    const model = buildQuestionnaireResponse(questionnaire);

    const [group] = model.getItems("group");
    const [childA] = model.getItems("child-a");

    expect(group.enabled).toBe(false);
    // No cascade: child has no enableWhen of its own, so it is always enabled
    expect(childA.enabled).toBe(true);
  });

  it("child with its own enableWhen is independently disabled", () => {
    const model = buildQuestionnaireResponse(questionnaire);

    const [group] = model.getItems("group");
    const [childB] = model.getItems("child-b");

    // Both disabled because their shared condition is not met
    expect(group.enabled).toBe(false);
    expect(childB.enabled).toBe(false);
  });

  it("enabling the toggle enables both group and its conditional child", () => {
    const model = buildQuestionnaireResponse(questionnaire);
    const [toggle] = model.getItems("toggle");

    toggle.setAnswer([{ valueBoolean: true }]);

    const [group] = model.getItems("group");
    const [childA] = model.getItems("child-a");
    const [childB] = model.getItems("child-b");

    expect(group.enabled).toBe(true);
    expect(childA.enabled).toBe(true);
    expect(childB.enabled).toBe(true);
  });

  it("disabling the toggle disables group and conditional child, not unconditional child", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [{ linkId: "toggle", answer: [{ valueBoolean: true }] }],
    };

    const model = buildQuestionnaireResponse(questionnaire, response);
    const [toggle] = model.getItems("toggle");

    // Start enabled
    expect(model.getItems("group")[0].enabled).toBe(true);

    toggle.setAnswer([{ valueBoolean: false }]);

    expect(model.getItems("group")[0].enabled).toBe(false);
    expect(model.getItems("child-a")[0].enabled).toBe(true);
    expect(model.getItems("child-b")[0].enabled).toBe(false);
  });
});
