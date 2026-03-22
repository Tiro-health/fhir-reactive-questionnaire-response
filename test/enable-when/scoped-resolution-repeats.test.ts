import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../../src/build/build.js";
import type {
  Questionnaire,
  QuestionnaireResponse,
} from "../../src/model/types.js";

/**
 * Repeating group with a multi-answer question (repeats=true) used as
 * an enableWhen source. Each group instance should resolve to its own
 * sibling's answers, not the first global instance.
 *
 *   med-group (group, repeats)
 *     allergies (string, repeats)
 *     allergy-warning (display, enableWhen: allergies exists true)
 */
const questionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "scoped-repeats-test",
  status: "active",
  item: [
    {
      linkId: "med-group",
      text: "Medication",
      type: "group",
      repeats: true,
      item: [
        {
          linkId: "allergies",
          text: "Known allergies",
          type: "string",
          repeats: true,
        },
        {
          linkId: "allergy-warning",
          text: "Warning: allergies present",
          type: "display",
          enableWhen: [
            {
              question: "allergies",
              operator: "exists",
              answerBoolean: true,
            },
          ],
        },
      ],
    },
  ],
};

describe("enableWhen — scoped resolution with repeating questions", () => {
  it("each group instance resolves to its own multi-answer sibling", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        {
          linkId: "med-group",
          item: [
            {
              linkId: "allergies",
              answer: [
                { valueString: "Penicillin" },
                { valueString: "Aspirin" },
              ],
            },
            { linkId: "allergy-warning" },
          ],
        },
        {
          linkId: "med-group",
          item: [
            { linkId: "allergies" },
            { linkId: "allergy-warning" },
          ],
        },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const warnings = rqr.getItems("allergy-warning");

    // Instance 1 has allergies → warning enabled
    expect(warnings[0].enabled).toBe(true);
    // Instance 2 has no allergies → warning disabled
    expect(warnings[1].enabled).toBe(false);
  });

  it("reactive updates on multi-answer stay scoped", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        {
          linkId: "med-group",
          item: [
            { linkId: "allergies" },
            { linkId: "allergy-warning" },
          ],
        },
        {
          linkId: "med-group",
          item: [
            { linkId: "allergies" },
            { linkId: "allergy-warning" },
          ],
        },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const allergyItems = rqr.getItems("allergies");
    const warnings = rqr.getItems("allergy-warning");

    // Both disabled initially
    expect(warnings[0].enabled).toBe(false);
    expect(warnings[1].enabled).toBe(false);

    // Add answers to instance 2 only
    allergyItems[1].setAnswer([{ valueString: "Latex" }]);
    expect(warnings[0].enabled).toBe(false);
    expect(warnings[1].enabled).toBe(true);

    // Add answers to instance 1
    allergyItems[0].addAnswer({ valueString: "Pollen" });
    expect(warnings[0].enabled).toBe(true);
    expect(warnings[1].enabled).toBe(true);

    // Clear instance 2
    allergyItems[1].setAnswer([]);
    expect(warnings[0].enabled).toBe(true);
    expect(warnings[1].enabled).toBe(false);
  });
});
