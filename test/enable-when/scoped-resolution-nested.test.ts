import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../../src/build/build.js";
import type {
  Questionnaire,
  QuestionnaireResponse,
} from "../../src/model/types.js";

/**
 * Nested questions (answer[].item[] pattern) where enableWhen references
 * a sibling within the same answer entry. Each answer entry's nested items
 * should resolve to their own entry's siblings.
 *
 *   medication (choice, with nested items)
 *     answer[].item[]:
 *       dosage (decimal)
 *       needs-review (display, enableWhen: dosage >= 100)
 */
const questionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "scoped-nested-test",
  status: "active",
  item: [
    {
      linkId: "medication",
      text: "Medication",
      type: "string",
      repeats: true,
      item: [
        { linkId: "dosage", text: "Dosage (mg)", type: "decimal" },
        {
          linkId: "needs-review",
          text: "Needs pharmacist review",
          type: "display",
          enableWhen: [
            {
              question: "dosage",
              operator: ">=",
              answerDecimal: 100,
            },
          ],
        },
      ],
    },
  ],
};

describe("enableWhen — scoped resolution within nested answer items", () => {
  it("each answer entry resolves enableWhen to its own nested sibling", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        {
          linkId: "medication",
          answer: [
            {
              valueString: "Ibuprofen",
              item: [
                { linkId: "dosage", answer: [{ valueDecimal: 50 }] },
                { linkId: "needs-review" },
              ],
            },
            {
              valueString: "Morphine",
              item: [
                { linkId: "dosage", answer: [{ valueDecimal: 150 }] },
                { linkId: "needs-review" },
              ],
            },
          ],
        },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const [medication] = rqr.getItems("medication");
    const entries = medication.answerEntries;

    const needsReview0 = entries[0].items.find(
      (i) => i.linkId === "needs-review",
    )!;
    const needsReview1 = entries[1].items.find(
      (i) => i.linkId === "needs-review",
    )!;

    // dosage=50 → review not needed
    expect(needsReview0.enabled).toBe(false);
    // dosage=150 → review needed
    expect(needsReview1.enabled).toBe(true);
  });

  it("reactive updates within nested items stay scoped to their entry", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        {
          linkId: "medication",
          answer: [
            {
              valueString: "Aspirin",
              item: [
                { linkId: "dosage", answer: [{ valueDecimal: 50 }] },
                { linkId: "needs-review" },
              ],
            },
            {
              valueString: "Paracetamol",
              item: [
                { linkId: "dosage", answer: [{ valueDecimal: 50 }] },
                { linkId: "needs-review" },
              ],
            },
          ],
        },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const [medication] = rqr.getItems("medication");
    const entries = medication.answerEntries;

    const dosage0 = entries[0].items.find((i) => i.linkId === "dosage")!;
    const dosage1 = entries[1].items.find((i) => i.linkId === "dosage")!;
    const needsReview0 = entries[0].items.find(
      (i) => i.linkId === "needs-review",
    )!;
    const needsReview1 = entries[1].items.find(
      (i) => i.linkId === "needs-review",
    )!;

    // Both below threshold
    expect(needsReview0.enabled).toBe(false);
    expect(needsReview1.enabled).toBe(false);

    // Increase entry 1's dosage → only entry 1 reacts
    dosage1.setAnswer([{ valueDecimal: 200 }]);
    expect(needsReview0.enabled).toBe(false);
    expect(needsReview1.enabled).toBe(true);

    // Increase entry 0's dosage → only entry 0 reacts
    dosage0.setAnswer([{ valueDecimal: 100 }]);
    expect(needsReview0.enabled).toBe(true);
    expect(needsReview1.enabled).toBe(true);

    // Decrease entry 1's dosage → only entry 1 reacts
    dosage1.setAnswer([{ valueDecimal: 10 }]);
    expect(needsReview0.enabled).toBe(true);
    expect(needsReview1.enabled).toBe(false);
  });

  it("dynamically added answer entry gets scoped resolution", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      item: [
        {
          linkId: "medication",
          answer: [
            {
              valueString: "Aspirin",
              item: [
                { linkId: "dosage", answer: [{ valueDecimal: 50 }] },
                { linkId: "needs-review" },
              ],
            },
          ],
        },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const [medication] = rqr.getItems("medication");

    const entry0NeedsReview = medication.answerEntries[0].items.find(
      (i) => i.linkId === "needs-review",
    )!;
    expect(entry0NeedsReview.enabled).toBe(false);

    // Add a new answer entry (children auto-created from definition)
    medication.addAnswer({ valueString: "Morphine" });

    const entries = medication.answerEntries;
    expect(entries).toHaveLength(2);

    // Set high dosage on the new entry
    const newDosage = entries[1].items.find((i) => i.linkId === "dosage")!;
    newDosage.setAnswer([{ valueDecimal: 200 }]);

    const newNeedsReview = entries[1].items.find(
      (i) => i.linkId === "needs-review",
    )!;

    // Original entry still below threshold
    expect(entry0NeedsReview.enabled).toBe(false);
    // New entry above threshold
    expect(newNeedsReview.enabled).toBe(true);
  });
});
