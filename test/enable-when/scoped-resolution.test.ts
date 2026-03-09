import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../../src/build/build.js";
import type {
  Questionnaire,
  QuestionnaireResponse,
} from "../../src/model/types.js";

/**
 * Questionnaire with a repeating group containing a boolean toggle
 * and a conditionally-enabled string field.
 *
 *   med-group (group, repeats)
 *     needs-dosage (boolean)
 *     dosage (string, enableWhen: needs-dosage = true)
 */
const questionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "scoped-resolution-test",
  status: "active",
  item: [
    {
      linkId: "med-group",
      text: "Medication",
      type: "group",
      repeats: true,
      item: [
        { linkId: "needs-dosage", text: "Needs dosage?", type: "boolean" },
        {
          linkId: "dosage",
          text: "Dosage",
          type: "string",
          enableWhen: [
            {
              question: "needs-dosage",
              operator: "=",
              answerBoolean: true,
            },
          ],
        },
      ],
    },
  ],
};

describe("enableWhen — scoped resolution within repeating groups", () => {
  it("each instance resolves enableWhen to its own sibling", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        {
          linkId: "med-group",
          item: [
            { linkId: "needs-dosage", answer: [{ valueBoolean: false }] },
            { linkId: "dosage" },
          ],
        },
        {
          linkId: "med-group",
          item: [
            { linkId: "needs-dosage", answer: [{ valueBoolean: true }] },
            { linkId: "dosage" },
          ],
        },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const dosageItems = rqr.getItems("dosage");

    expect(dosageItems[0].enabled).toBe(false);
    expect(dosageItems[1].enabled).toBe(true);
  });

  it("reactive updates stay scoped to their own group instance", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        {
          linkId: "med-group",
          item: [
            { linkId: "needs-dosage", answer: [{ valueBoolean: false }] },
            { linkId: "dosage" },
          ],
        },
        {
          linkId: "med-group",
          item: [
            { linkId: "needs-dosage", answer: [{ valueBoolean: false }] },
            { linkId: "dosage" },
          ],
        },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const needsDosageItems = rqr.getItems("needs-dosage");
    const dosageItems = rqr.getItems("dosage");

    // Both disabled initially
    expect(dosageItems[0].enabled).toBe(false);
    expect(dosageItems[1].enabled).toBe(false);

    // Flip instance 1 on → only dosage[0] reacts
    needsDosageItems[0].setAnswer([{ valueBoolean: true }]);
    expect(dosageItems[0].enabled).toBe(true);
    expect(dosageItems[1].enabled).toBe(false);

    // Flip instance 2 on → only dosage[1] reacts
    needsDosageItems[1].setAnswer([{ valueBoolean: true }]);
    expect(dosageItems[0].enabled).toBe(true);
    expect(dosageItems[1].enabled).toBe(true);

    // Flip instance 2 off → only dosage[1] reacts
    needsDosageItems[1].setAnswer([{ valueBoolean: false }]);
    expect(dosageItems[0].enabled).toBe(true);
    expect(dosageItems[1].enabled).toBe(false);
  });

  it("dynamically added instance gets scoped resolution", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        {
          linkId: "med-group",
          item: [
            { linkId: "needs-dosage", answer: [{ valueBoolean: false }] },
            { linkId: "dosage" },
          ],
        },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const dosageItems = rqr.getItems("dosage");
    expect(dosageItems[0].enabled).toBe(false);

    // Add a second group instance with needs-dosage=true
    const group2 = rqr.addItem("med-group", {
      linkId: "med-group",
      item: [
        { linkId: "needs-dosage", answer: [{ valueBoolean: true }] },
        { linkId: "dosage" },
      ],
    });

    const dosage0 = rqr.getItems("dosage")[0];
    const dosage1 = group2.items.find((i) => i.linkId === "dosage")!;

    expect(dosage0.enabled).toBe(false);
    expect(dosage1.enabled).toBe(true);
  });
});
