import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../src/build/build.js";
import type { Questionnaire } from "../src/model/types.js";

const TOGGLE_EXT_URL =
  "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-answerOptionsToggleExpression";

describe("visible computed properties", () => {
  const questionnaire: Questionnaire = {
    resourceType: "Questionnaire",
    id: "visible-test",
    status: "active",
    item: [
      {
        linkId: "toggle",
        text: "Toggle",
        type: "boolean",
      },
      {
        linkId: "hidden-when-disabled",
        text: "Hidden",
        type: "string",
        disabledDisplay: "hidden",
        enableWhen: [
          { question: "toggle", operator: "=", answerBoolean: true },
        ],
      },
      {
        linkId: "protected-when-disabled",
        text: "Protected",
        type: "string",
        disabledDisplay: "protected",
        enableWhen: [
          { question: "toggle", operator: "=", answerBoolean: true },
        ],
      },
      {
        linkId: "default-disabled",
        text: "Default (no disabledDisplay)",
        type: "string",
        enableWhen: [
          { question: "toggle", operator: "=", answerBoolean: true },
        ],
      },
      {
        linkId: "parent-group",
        text: "Parent",
        type: "group",
        item: [
          {
            linkId: "child-hidden",
            text: "Child hidden",
            type: "string",
            disabledDisplay: "hidden",
            enableWhen: [
              { question: "toggle", operator: "=", answerBoolean: true },
            ],
          },
          {
            linkId: "child-always",
            text: "Child always visible",
            type: "string",
          },
        ],
      },
    ],
  };

  it("visible is false for disabled items with disabledDisplay=hidden", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [item] = rqr.getItems("hidden-when-disabled");
    expect(item.enabled).toBe(false);
    expect(item.visible).toBe(false);
  });

  it("visible is true for disabled items with disabledDisplay=protected", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [item] = rqr.getItems("protected-when-disabled");
    expect(item.enabled).toBe(false);
    expect(item.visible).toBe(true);
  });

  it("visible is true for disabled items without disabledDisplay", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [item] = rqr.getItems("default-disabled");
    expect(item.enabled).toBe(false);
    expect(item.visible).toBe(true);
  });

  it("visible becomes true when item is enabled", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [toggle] = rqr.getItems("toggle");
    const [item] = rqr.getItems("hidden-when-disabled");

    expect(item.visible).toBe(false);
    toggle.setAnswer([{ valueBoolean: true }]);
    expect(item.visible).toBe(true);
  });

  it("visibleItems filters hidden children", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [parent] = rqr.getItems("parent-group");

    expect(parent.visibleItems).toHaveLength(1);
    expect(parent.visibleItems[0].linkId).toBe("child-always");
    expect(parent.hasVisibleItems).toBe(true);
  });

  it("visibleItems includes all children when enabled", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [toggle] = rqr.getItems("toggle");
    const [parent] = rqr.getItems("parent-group");

    toggle.setAnswer([{ valueBoolean: true }]);
    expect(parent.visibleItems).toHaveLength(2);
  });
});

describe("enabledAnswerOptions", () => {
  const questionnaire: Questionnaire = {
    resourceType: "Questionnaire",
    id: "enabled-opts-test",
    status: "active",
    item: [
      { linkId: "toggle", text: "Toggle", type: "boolean" },
      {
        linkId: "meds",
        text: "Medications",
        type: "coding",
        answerOption: [
          { valueCoding: { code: "aspirin", display: "Aspirin" } },
          { valueCoding: { code: "ibuprofen", display: "Ibuprofen" } },
          { valueCoding: { code: "tylenol", display: "Tylenol" } },
        ],
        extension: [
          {
            url: TOGGLE_EXT_URL,
            extension: [
              {
                url: "option",
                valueCoding: { code: "aspirin", display: "Aspirin" },
              },
              {
                url: "option",
                valueCoding: { code: "ibuprofen", display: "Ibuprofen" },
              },
              {
                url: "expression",
                valueExpression: {
                  language: "text/fhirpath",
                  expression:
                    "%resource.item.where(linkId='toggle').answer.value = true",
                },
              },
            ],
          },
        ],
      },
    ],
  };

  it("returns only enabled options", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [meds] = rqr.getItems("meds");

    // Toggle is off → aspirin and ibuprofen disabled
    expect(meds.enabledAnswerOptions).toHaveLength(1);
    expect(meds.enabledAnswerOptions[0].value.valueCoding?.code).toBe("tylenol");
  });

  it("returns all options when toggle is on", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const [toggle] = rqr.getItems("toggle");
    const [meds] = rqr.getItems("meds");

    toggle.setAnswer([{ valueBoolean: true }]);
    expect(meds.enabledAnswerOptions).toHaveLength(3);
  });
});
