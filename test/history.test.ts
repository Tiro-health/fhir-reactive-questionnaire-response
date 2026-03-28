import { describe, it, expect } from "vitest";
import { FormHistory } from "../src/history.js";
import type {
  Questionnaire,
  QuestionnaireResponse,
} from "../src/model/types.js";

const questionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "history-test",
  status: "active",
  item: [
    { linkId: "name", text: "Name", type: "string" },
    { linkId: "age", text: "Age", type: "integer" },
    {
      linkId: "bmi",
      text: "BMI",
      type: "decimal",
      extension: [
        {
          url: "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression",
          valueExpression: {
            language: "text/fhirpath",
            expression: "%resource.item.where(linkId='age').answer.value",
          },
        },
      ],
    },
    {
      linkId: "notes",
      text: "Notes",
      type: "group",
      repeats: true,
      item: [{ linkId: "note-text", text: "Note", type: "string" }],
    },
  ],
};

describe("FormHistory", () => {
  it("starts with no undo/redo", () => {
    const history = new FormHistory(questionnaire);
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });

  it("provides a working model", () => {
    const history = new FormHistory(questionnaire);
    const [name] = history.model.getItems("name");
    expect(name.linkId).toBe("name");
  });

  describe("capture + undo", () => {
    it("restores previous answer state", () => {
      const history = new FormHistory(questionnaire);
      const name = () => history.model.getItems("name")[0];

      name().setAnswer([{ valueString: "Alice" }]);
      history.capture();

      name().setAnswer([{ valueString: "Bob" }]);
      history.capture();

      history.undo();
      expect(name().answerValues).toEqual([{ valueString: "Alice" }]);
    });

    it("restores to empty state", () => {
      const history = new FormHistory(questionnaire);
      const name = () => history.model.getItems("name")[0];

      name().setAnswer([{ valueString: "Alice" }]);
      history.capture();

      history.undo();
      expect(name().answerValues).toEqual([]);
    });

    it("restores multiple items", () => {
      const history = new FormHistory(questionnaire);
      const name = () => history.model.getItems("name")[0];
      const age = () => history.model.getItems("age")[0];

      name().setAnswer([{ valueString: "Alice" }]);
      age().setAnswer([{ valueInteger: 30 }]);
      history.capture();

      name().setAnswer([{ valueString: "Bob" }]);
      age().setAnswer([{ valueInteger: 25 }]);
      history.capture();

      history.undo();
      expect(name().answerValues).toEqual([{ valueString: "Alice" }]);
      expect(age().answerValues).toEqual([{ valueInteger: 30 }]);
    });

    it("is a no-op when nothing to undo", () => {
      const history = new FormHistory(questionnaire);
      const name = () => history.model.getItems("name")[0];

      name().setAnswer([{ valueString: "Alice" }]);
      history.undo();
      expect(name().answerValues).toEqual([{ valueString: "Alice" }]);
    });
  });

  describe("redo", () => {
    it("re-applies the undone state", () => {
      const history = new FormHistory(questionnaire);
      const name = () => history.model.getItems("name")[0];

      name().setAnswer([{ valueString: "Alice" }]);
      history.capture();

      history.undo();
      expect(name().answerValues).toEqual([]);

      history.redo();
      expect(name().answerValues).toEqual([{ valueString: "Alice" }]);
    });

    it("is a no-op when nothing to redo", () => {
      const history = new FormHistory(questionnaire);
      history.redo();
      expect(history.canRedo).toBe(false);
    });

    it("clears redo stack on new capture", () => {
      const history = new FormHistory(questionnaire);
      const name = () => history.model.getItems("name")[0];

      name().setAnswer([{ valueString: "Alice" }]);
      history.capture();

      history.undo();
      expect(history.canRedo).toBe(true);

      name().setAnswer([{ valueString: "Charlie" }]);
      history.capture();
      expect(history.canRedo).toBe(false);
    });
  });

  describe("multi-step", () => {
    it("supports multiple undo and redo steps", () => {
      const history = new FormHistory(questionnaire);
      const name = () => history.model.getItems("name")[0];

      name().setAnswer([{ valueString: "A" }]);
      history.capture();
      name().setAnswer([{ valueString: "B" }]);
      history.capture();
      name().setAnswer([{ valueString: "C" }]);
      history.capture();

      history.undo();
      expect(name().answerValues).toEqual([{ valueString: "B" }]);
      history.undo();
      expect(name().answerValues).toEqual([{ valueString: "A" }]);
      history.undo();
      expect(name().answerValues).toEqual([]);

      history.redo();
      expect(name().answerValues).toEqual([{ valueString: "A" }]);
      history.redo();
      expect(name().answerValues).toEqual([{ valueString: "B" }]);
    });
  });

  describe("deduplication", () => {
    it("does not capture duplicate snapshots", () => {
      const history = new FormHistory(questionnaire);
      history.capture();
      history.capture();
      expect(history.canUndo).toBe(false);
    });
  });

  describe("maxSize", () => {
    it("evicts oldest snapshots", () => {
      const history = new FormHistory(questionnaire, undefined, {
        maxSize: 3,
      });
      const name = () => history.model.getItems("name")[0];

      for (const val of ["A", "B", "C", "D"]) {
        name().setAnswer([{ valueString: val }]);
        history.capture();
      }

      // Can undo 3 times (maxSize)
      history.undo();
      expect(name().answerValues).toEqual([{ valueString: "C" }]);
      history.undo();
      expect(name().answerValues).toEqual([{ valueString: "B" }]);
      history.undo();
      expect(name().answerValues).toEqual([{ valueString: "A" }]);

      // Can't go further — initial state was evicted
      history.undo();
      expect(name().answerValues).toEqual([{ valueString: "A" }]);
    });
  });

  describe("calculated expressions", () => {
    it("recalculates after undo", () => {
      const history = new FormHistory(questionnaire);
      const age = () => history.model.getItems("age")[0];
      const bmi = () => history.model.getItems("bmi")[0];

      age().setAnswer([{ valueInteger: 30 }]);
      history.capture();
      expect(bmi().answerValues).toEqual([{ valueDecimal: 30 }]);

      age().setAnswer([{ valueInteger: 25 }]);
      history.capture();
      expect(bmi().answerValues).toEqual([{ valueDecimal: 25 }]);

      history.undo();
      expect(bmi().answerValues).toEqual([{ valueDecimal: 30 }]);
    });
  });

  describe("pre-populated response", () => {
    it("captures initial state from a pre-populated response", () => {
      const response: QuestionnaireResponse = {
        resourceType: "QuestionnaireResponse",
        status: "in-progress",
        questionnaire: "history-test",
        item: [
          { linkId: "name", answer: [{ valueString: "Alice" }] },
          { linkId: "age", answer: [{ valueInteger: 30 }] },
        ],
      };

      const history = new FormHistory(questionnaire, response);
      const name = () => history.model.getItems("name")[0];

      name().setAnswer([{ valueString: "Bob" }]);
      history.capture();

      history.undo();
      expect(name().answerValues).toEqual([{ valueString: "Alice" }]);
    });
  });

  describe("structural changes", () => {
    it("restores added repeating group instances", () => {
      const history = new FormHistory(questionnaire);

      // Start with 1 notes instance (from build)
      expect(history.model.getItems("notes")).toHaveLength(1);
      const noteText = () => history.model.getItems("note-text");
      noteText()[0].setAnswer([{ valueString: "First note" }]);
      history.capture();

      // Add another instance
      history.model.addItem("notes");
      expect(history.model.getItems("notes")).toHaveLength(2);
      history.capture();

      // Undo — should go back to 1 instance
      history.undo();
      expect(history.model.getItems("notes")).toHaveLength(1);
      expect(noteText()[0].answerValues).toEqual([
        { valueString: "First note" },
      ]);
    });
  });

  describe("model reference changes on undo/redo", () => {
    it("returns a new model after undo", () => {
      const history = new FormHistory(questionnaire);
      const modelBefore = history.model;

      history.model.getItems("name")[0].setAnswer([{ valueString: "Alice" }]);
      history.capture();

      history.undo();
      expect(history.model).not.toBe(modelBefore);
    });
  });
});
