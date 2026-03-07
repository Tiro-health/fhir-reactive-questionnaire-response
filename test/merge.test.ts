import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../src/build/build.js";
import {
  mergeResponse,
  overwrite,
  keepExisting,
  append,
} from "../src/model/merge.js";
import { CALCULATED_EXPRESSION } from "../src/build/extensions.js";
import type {
  Questionnaire,
  QuestionnaireResponse,
} from "../src/model/types.js";

// ── Fixtures ──────────────────────────────────────────────────────────

const simpleQuestionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "simple",
  status: "active",
  item: [
    { linkId: "name", text: "Name", type: "string" },
    { linkId: "age", text: "Age", type: "integer" },
  ],
};

const groupedQuestionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "grouped",
  status: "active",
  item: [
    {
      linkId: "demographics",
      text: "Demographics",
      type: "group",
      item: [
        { linkId: "first-name", text: "First name", type: "string" },
        { linkId: "last-name", text: "Last name", type: "string" },
      ],
    },
    { linkId: "notes", text: "Notes", type: "text" },
  ],
};

const repeatingGroupQuestionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "repeating",
  status: "active",
  item: [
    { linkId: "patient", text: "Patient", type: "string" },
    {
      linkId: "med-group",
      text: "Medication",
      type: "group",
      repeats: true,
      item: [
        { linkId: "med-name", text: "Medication name", type: "string" },
        { linkId: "dosage", text: "Dosage", type: "string" },
      ],
    },
  ],
};

const calculatedQuestionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "calc",
  status: "active",
  item: [
    { linkId: "a", text: "A", type: "integer" },
    { linkId: "b", text: "B", type: "integer" },
    {
      linkId: "sum",
      text: "Sum",
      type: "integer",
      readOnly: true,
      extension: [
        {
          url: CALCULATED_EXPRESSION,
          valueExpression: {
            language: "text/fhirpath",
            expression:
              "%resource.item.where(linkId='a').answer.value + %resource.item.where(linkId='b').answer.value",
          },
        },
      ],
    },
  ],
};

const nestedAnswerQuestionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "nested-answer",
  status: "active",
  item: [
    {
      linkId: "allergy",
      text: "Allergy",
      type: "string",
      repeats: true,
      item: [
        { linkId: "severity", text: "Severity", type: "string" },
        { linkId: "onset", text: "Onset date", type: "date" },
      ],
    },
  ],
};

// ── Tests ─────────────────────────────────────────────────────────────

describe("mergeResponse", () => {
  describe("overwrite strategy (default)", () => {
    it("overwrites answer on a simple item", () => {
      const model = buildQuestionnaireResponse(simpleQuestionnaire, {
        resourceType: "QuestionnaireResponse",
        status: "in-progress",
        item: [
          { linkId: "name", answer: [{ valueString: "Alice" }] },
          { linkId: "age", answer: [{ valueInteger: 30 }] },
        ],
      });

      mergeResponse(model, {
        resourceType: "QuestionnaireResponse",
        status: "in-progress",
        item: [
          { linkId: "name", answer: [{ valueString: "Bob" }] },
        ],
      });

      const [name] = model.getItems("name");
      const [age] = model.getItems("age");
      expect(name.answerValues).toEqual([{ valueString: "Bob" }]);
      // age not in partial — untouched
      expect(age.answerValues).toEqual([{ valueInteger: 30 }]);
    });

    it("uses overwrite as default strategy", () => {
      const model = buildQuestionnaireResponse(simpleQuestionnaire, {
        resourceType: "QuestionnaireResponse",
        status: "in-progress",
        item: [{ linkId: "name", answer: [{ valueString: "Old" }] }],
      });

      model.merge({
        resourceType: "QuestionnaireResponse",
        status: "in-progress",
        item: [{ linkId: "name", answer: [{ valueString: "New" }] }],
      });

      expect(model.getItems("name")[0].answerValues).toEqual([
        { valueString: "New" },
      ]);
    });
  });

  describe("keepExisting strategy", () => {
    it("preserves existing answers when present", () => {
      const model = buildQuestionnaireResponse(simpleQuestionnaire, {
        resourceType: "QuestionnaireResponse",
        status: "in-progress",
        item: [
          { linkId: "name", answer: [{ valueString: "Existing" }] },
        ],
      });

      mergeResponse(
        model,
        {
          resourceType: "QuestionnaireResponse",
          status: "in-progress",
          item: [
            { linkId: "name", answer: [{ valueString: "Incoming" }] },
          ],
        },
        keepExisting,
      );

      expect(model.getItems("name")[0].answerValues).toEqual([
        { valueString: "Existing" },
      ]);
    });

    it("applies incoming when no existing answer", () => {
      const model = buildQuestionnaireResponse(simpleQuestionnaire);

      mergeResponse(
        model,
        {
          resourceType: "QuestionnaireResponse",
          status: "in-progress",
          item: [
            { linkId: "name", answer: [{ valueString: "Incoming" }] },
          ],
        },
        keepExisting,
      );

      expect(model.getItems("name")[0].answerValues).toEqual([
        { valueString: "Incoming" },
      ]);
    });
  });

  describe("append strategy", () => {
    it("concatenates existing and incoming answers", () => {
      const model = buildQuestionnaireResponse(simpleQuestionnaire, {
        resourceType: "QuestionnaireResponse",
        status: "in-progress",
        item: [
          { linkId: "name", answer: [{ valueString: "First" }] },
        ],
      });

      mergeResponse(
        model,
        {
          resourceType: "QuestionnaireResponse",
          status: "in-progress",
          item: [
            { linkId: "name", answer: [{ valueString: "Second" }] },
          ],
        },
        append,
      );

      expect(model.getItems("name")[0].answerValues).toEqual([
        { valueString: "First" },
        { valueString: "Second" },
      ]);
    });
  });

  describe("repeating groups", () => {
    it("appends repeating group instances", () => {
      const model = buildQuestionnaireResponse(repeatingGroupQuestionnaire, {
        resourceType: "QuestionnaireResponse",
        status: "in-progress",
        item: [
          { linkId: "patient", answer: [{ valueString: "John" }] },
          {
            linkId: "med-group",
            item: [
              { linkId: "med-name", answer: [{ valueString: "Aspirin" }] },
              { linkId: "dosage", answer: [{ valueString: "100mg" }] },
            ],
          },
        ],
      });

      expect(model.getItems("med-group")).toHaveLength(1);

      mergeResponse(model, {
        resourceType: "QuestionnaireResponse",
        status: "in-progress",
        item: [
          {
            linkId: "med-group",
            item: [
              { linkId: "med-name", answer: [{ valueString: "Ibuprofen" }] },
              { linkId: "dosage", answer: [{ valueString: "200mg" }] },
            ],
          },
          {
            linkId: "med-group",
            item: [
              { linkId: "med-name", answer: [{ valueString: "Paracetamol" }] },
              { linkId: "dosage", answer: [{ valueString: "500mg" }] },
            ],
          },
        ],
      });

      const groups = model.getItems("med-group");
      expect(groups).toHaveLength(3);

      // Original group is untouched
      expect(groups[0].items[0].answerValues).toEqual([
        { valueString: "Aspirin" },
      ]);

      // Two new groups appended
      expect(groups[1].items[0].answerValues).toEqual([
        { valueString: "Ibuprofen" },
      ]);
      expect(groups[2].items[0].answerValues).toEqual([
        { valueString: "Paracetamol" },
      ]);
    });
  });

  describe("calculated items", () => {
    it("throws when partial provides an answer for a calculated item", () => {
      const model = buildQuestionnaireResponse(calculatedQuestionnaire, {
        resourceType: "QuestionnaireResponse",
        status: "in-progress",
        item: [
          { linkId: "a", answer: [{ valueInteger: 1 }] },
          { linkId: "b", answer: [{ valueInteger: 2 }] },
        ],
      });

      expect(() =>
        mergeResponse(model, {
          resourceType: "QuestionnaireResponse",
          status: "in-progress",
          item: [{ linkId: "sum", answer: [{ valueInteger: 99 }] }],
        }),
      ).toThrow(/calculated/i);
    });
  });

  describe("nested groups", () => {
    it("recurses into nested group children", () => {
      const model = buildQuestionnaireResponse(groupedQuestionnaire, {
        resourceType: "QuestionnaireResponse",
        status: "in-progress",
        item: [
          {
            linkId: "demographics",
            item: [
              { linkId: "first-name", answer: [{ valueString: "Alice" }] },
              { linkId: "last-name", answer: [{ valueString: "Smith" }] },
            ],
          },
          { linkId: "notes", answer: [{ valueString: "Original notes" }] },
        ],
      });

      mergeResponse(model, {
        resourceType: "QuestionnaireResponse",
        status: "in-progress",
        item: [
          {
            linkId: "demographics",
            item: [
              { linkId: "first-name", answer: [{ valueString: "Bob" }] },
            ],
          },
        ],
      });

      const [firstName] = model.getItems("first-name");
      const [lastName] = model.getItems("last-name");
      const [notes] = model.getItems("notes");

      expect(firstName.answerValues).toEqual([{ valueString: "Bob" }]);
      // last-name not in partial → untouched
      expect(lastName.answerValues).toEqual([{ valueString: "Smith" }]);
      // notes not in partial → untouched
      expect(notes.answerValues).toEqual([{ valueString: "Original notes" }]);
    });
  });

  describe("answer[].item[] pattern", () => {
    it("merges answers and recurses into answer entry children", () => {
      const model = buildQuestionnaireResponse(nestedAnswerQuestionnaire, {
        resourceType: "QuestionnaireResponse",
        status: "in-progress",
        item: [
          {
            linkId: "allergy",
            answer: [{ valueString: "Peanuts" }],
          },
        ],
      });

      const [allergy] = model.getItems("allergy");
      expect(allergy.answerEntries).toHaveLength(1);

      // Merge a partial that overwrites the allergy answer and sets severity
      mergeResponse(model, {
        resourceType: "QuestionnaireResponse",
        status: "in-progress",
        item: [
          {
            linkId: "allergy",
            answer: [
              {
                valueString: "Peanuts",
                item: [
                  {
                    linkId: "severity",
                    answer: [{ valueString: "severe" }],
                  },
                ],
              },
            ],
          },
        ],
      });

      const entries = allergy.answerEntries;
      expect(entries).toHaveLength(1);
      expect(entries[0].value).toEqual({ valueString: "Peanuts" });

      const severity = entries[0].items.find(
        (i) => i.linkId === "severity",
      );
      expect(severity?.answerValues).toEqual([{ valueString: "severe" }]);
    });
  });

  describe("error handling", () => {
    it("throws on unknown linkId", () => {
      const model = buildQuestionnaireResponse(simpleQuestionnaire);

      expect(() =>
        mergeResponse(model, {
          resourceType: "QuestionnaireResponse",
          status: "in-progress",
          item: [
            { linkId: "nonexistent", answer: [{ valueString: "val" }] },
          ],
        }),
      ).toThrow(/definition.*nonexistent/i);
    });
  });

  describe("items not in partial", () => {
    it("leaves untouched items unchanged", () => {
      const model = buildQuestionnaireResponse(simpleQuestionnaire, {
        resourceType: "QuestionnaireResponse",
        status: "in-progress",
        item: [
          { linkId: "name", answer: [{ valueString: "Alice" }] },
          { linkId: "age", answer: [{ valueInteger: 30 }] },
        ],
      });

      // Partial only touches "age"
      mergeResponse(model, {
        resourceType: "QuestionnaireResponse",
        status: "in-progress",
        item: [{ linkId: "age", answer: [{ valueInteger: 31 }] }],
      });

      expect(model.getItems("name")[0].answerValues).toEqual([
        { valueString: "Alice" },
      ]);
      expect(model.getItems("age")[0].answerValues).toEqual([
        { valueInteger: 31 },
      ]);
    });
  });

  describe("convenience method", () => {
    it("model.merge() delegates to mergeResponse()", () => {
      const model = buildQuestionnaireResponse(simpleQuestionnaire);

      model.merge(
        {
          resourceType: "QuestionnaireResponse",
          status: "in-progress",
          item: [
            { linkId: "name", answer: [{ valueString: "via-merge" }] },
          ],
        },
        overwrite,
      );

      expect(model.getItems("name")[0].answerValues).toEqual([
        { valueString: "via-merge" },
      ]);
    });

    it("model.merge() accepts a strategy", () => {
      const model = buildQuestionnaireResponse(simpleQuestionnaire, {
        resourceType: "QuestionnaireResponse",
        status: "in-progress",
        item: [{ linkId: "name", answer: [{ valueString: "Old" }] }],
      });

      model.merge(
        {
          resourceType: "QuestionnaireResponse",
          status: "in-progress",
          item: [{ linkId: "name", answer: [{ valueString: "New" }] }],
        },
        keepExisting,
      );

      expect(model.getItems("name")[0].answerValues).toEqual([
        { valueString: "Old" },
      ]);
    });
  });
});
