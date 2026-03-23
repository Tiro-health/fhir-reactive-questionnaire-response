import { describe, it, expect, vi, afterEach } from "vitest";
import { buildQuestionnaireResponse } from "../src/build/build.js";
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
    { linkId: "notes", text: "Notes", type: "text" },
  ],
};

function buildModel(response?: QuestionnaireResponse) {
  return buildQuestionnaireResponse(questionnaire, response);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FormHistory", () => {
  describe("initial state", () => {
    it("canUndo is false initially", () => {
      const model = buildModel();
      const history = new FormHistory(model);

      expect(history.canUndo).toBe(false);
      expect(history.canRedo).toBe(false);

      history.dispose();
    });
  });

  describe("captureState", () => {
    it("captures current state as an undo point", () => {
      const model = buildModel();
      const history = new FormHistory(model);
      const [name] = model.getItems("name");

      name.setAnswer([{ valueString: "Alice" }]);
      history.captureState();

      expect(history.canUndo).toBe(true);
      expect(history.canRedo).toBe(false);

      history.dispose();
    });

    it("does not capture duplicate snapshots", () => {
      const model = buildModel();
      const history = new FormHistory(model);

      history.captureState();
      history.captureState();

      expect(history.canUndo).toBe(false);

      history.dispose();
    });
  });

  describe("undo", () => {
    it("restores the previous answer state", () => {
      const model = buildModel();
      const history = new FormHistory(model);
      const [name] = model.getItems("name");

      name.setAnswer([{ valueString: "Alice" }]);
      history.captureState();

      name.setAnswer([{ valueString: "Bob" }]);
      history.captureState();

      history.undo();

      expect(name.answerValues).toEqual([{ valueString: "Alice" }]);

      history.dispose();
    });

    it("restores to empty state when undoing the first change", () => {
      const model = buildModel();
      const history = new FormHistory(model);
      const [name] = model.getItems("name");

      name.setAnswer([{ valueString: "Alice" }]);
      history.captureState();

      history.undo();

      expect(name.answerValues).toEqual([]);

      history.dispose();
    });

    it("restores multiple items", () => {
      const model = buildModel();
      const history = new FormHistory(model);
      const [name] = model.getItems("name");
      const [age] = model.getItems("age");

      name.setAnswer([{ valueString: "Alice" }]);
      age.setAnswer([{ valueInteger: 30 }]);
      history.captureState();

      name.setAnswer([{ valueString: "Bob" }]);
      age.setAnswer([{ valueInteger: 25 }]);
      history.captureState();

      history.undo();

      expect(name.answerValues).toEqual([{ valueString: "Alice" }]);
      expect(age.answerValues).toEqual([{ valueInteger: 30 }]);

      history.dispose();
    });

    it("is a no-op when nothing to undo", () => {
      const model = buildModel();
      const history = new FormHistory(model);
      const [name] = model.getItems("name");

      name.setAnswer([{ valueString: "Alice" }]);

      history.undo();

      expect(name.answerValues).toEqual([{ valueString: "Alice" }]);

      history.dispose();
    });
  });

  describe("redo", () => {
    it("re-applies the undone state", () => {
      const model = buildModel();
      const history = new FormHistory(model);
      const [name] = model.getItems("name");

      name.setAnswer([{ valueString: "Alice" }]);
      history.captureState();

      history.undo();
      expect(name.answerValues).toEqual([]);

      history.redo();
      expect(name.answerValues).toEqual([{ valueString: "Alice" }]);

      history.dispose();
    });

    it("is a no-op when nothing to redo", () => {
      const model = buildModel();
      const history = new FormHistory(model);

      history.redo();

      expect(history.canRedo).toBe(false);

      history.dispose();
    });

    it("redo stack is cleared on new capture after undo", () => {
      const model = buildModel();
      const history = new FormHistory(model);
      const [name] = model.getItems("name");

      name.setAnswer([{ valueString: "Alice" }]);
      history.captureState();

      name.setAnswer([{ valueString: "Bob" }]);
      history.captureState();

      history.undo();
      expect(history.canRedo).toBe(true);

      // New change clears redo
      name.setAnswer([{ valueString: "Charlie" }]);
      history.captureState();

      expect(history.canRedo).toBe(false);

      history.dispose();
    });
  });

  describe("multi-step undo/redo", () => {
    it("supports multiple undo and redo steps", () => {
      const model = buildModel();
      const history = new FormHistory(model);
      const [name] = model.getItems("name");

      name.setAnswer([{ valueString: "A" }]);
      history.captureState();

      name.setAnswer([{ valueString: "B" }]);
      history.captureState();

      name.setAnswer([{ valueString: "C" }]);
      history.captureState();

      history.undo();
      expect(name.answerValues).toEqual([{ valueString: "B" }]);

      history.undo();
      expect(name.answerValues).toEqual([{ valueString: "A" }]);

      history.undo();
      expect(name.answerValues).toEqual([]);

      history.redo();
      expect(name.answerValues).toEqual([{ valueString: "A" }]);

      history.redo();
      expect(name.answerValues).toEqual([{ valueString: "B" }]);

      history.dispose();
    });
  });

  describe("maxSize", () => {
    it("evicts oldest snapshots when max size is exceeded", () => {
      const model = buildModel();
      const history = new FormHistory(model, { maxSize: 3 });
      const [name] = model.getItems("name");

      for (const val of ["A", "B", "C", "D"]) {
        name.setAnswer([{ valueString: val }]);
        history.captureState();
      }

      // Undo 3 times — that's the max we can go back
      history.undo();
      expect(name.answerValues).toEqual([{ valueString: "C" }]);

      history.undo();
      expect(name.answerValues).toEqual([{ valueString: "B" }]);

      history.undo();
      expect(name.answerValues).toEqual([{ valueString: "A" }]);

      // Can't undo further — initial empty state was evicted
      history.undo();
      expect(name.answerValues).toEqual([{ valueString: "A" }]);

      history.dispose();
    });
  });

  describe("debounced auto-capture", () => {
    it("auto-captures after debounce interval", async () => {
      vi.useFakeTimers();
      const model = buildModel();
      const history = new FormHistory(model, { debounceMs: 100 });
      const [name] = model.getItems("name");

      name.setAnswer([{ valueString: "Alice" }]);

      // Not captured yet
      expect(history.canUndo).toBe(false);

      vi.advanceTimersByTime(100);

      expect(history.canUndo).toBe(true);

      history.dispose();
      vi.useRealTimers();
    });

    it("debounces rapid changes into a single snapshot", async () => {
      vi.useFakeTimers();
      const model = buildModel();
      const history = new FormHistory(model, { debounceMs: 100 });
      const [name] = model.getItems("name");

      name.setAnswer([{ valueString: "A" }]);
      vi.advanceTimersByTime(50);

      name.setAnswer([{ valueString: "AB" }]);
      vi.advanceTimersByTime(50);

      name.setAnswer([{ valueString: "ABC" }]);
      vi.advanceTimersByTime(100);

      // Only one undo step
      expect(history.canUndo).toBe(true);

      history.undo();
      expect(name.answerValues).toEqual([]);
      expect(history.canUndo).toBe(false);

      history.dispose();
      vi.useRealTimers();
    });
  });

  describe("no capture during restore", () => {
    it("undo does not create a new history entry", () => {
      vi.useFakeTimers();
      const model = buildModel();
      const history = new FormHistory(model, { debounceMs: 100 });
      const [name] = model.getItems("name");

      name.setAnswer([{ valueString: "Alice" }]);
      history.captureState();

      history.undo();
      vi.advanceTimersByTime(200);

      // Should still be able to redo — no new entry was captured from the restore
      expect(history.canRedo).toBe(true);
      expect(history.canUndo).toBe(false);

      history.dispose();
      vi.useRealTimers();
    });
  });

  describe("calculated expressions are excluded", () => {
    it("does not snapshot or restore calculated items", () => {
      const calcQuestionnaire: Questionnaire = {
        resourceType: "Questionnaire",
        id: "calc-test",
        status: "active",
        item: [
          { linkId: "weight", text: "Weight", type: "decimal" },
          {
            linkId: "bmi",
            text: "BMI",
            type: "decimal",
            extension: [
              {
                url: "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression",
                valueExpression: {
                  language: "text/fhirpath",
                  expression: "%resource.item.where(linkId='weight').answer.value",
                },
              },
            ],
          },
        ],
      };

      const model = buildQuestionnaireResponse(calcQuestionnaire);
      const history = new FormHistory(model);
      const [weight] = model.getItems("weight");
      const [bmi] = model.getItems("bmi");

      weight.setAnswer([{ valueDecimal: 80 }]);
      history.captureState();

      // BMI is calculated — should follow weight, not be independently tracked
      expect(bmi.answerValues).toEqual([{ valueDecimal: 80 }]);

      weight.setAnswer([{ valueDecimal: 70 }]);
      history.captureState();

      history.undo();
      expect(weight.answerValues).toEqual([{ valueDecimal: 80 }]);
      expect(bmi.answerValues).toEqual([{ valueDecimal: 80 }]);

      history.dispose();
    });
  });

  describe("dispose", () => {
    it("stops auto-capture after dispose", () => {
      vi.useFakeTimers();
      const model = buildModel();
      const history = new FormHistory(model, { debounceMs: 100 });
      const [name] = model.getItems("name");

      history.dispose();

      name.setAnswer([{ valueString: "Alice" }]);
      vi.advanceTimersByTime(200);

      expect(history.canUndo).toBe(false);

      vi.useRealTimers();
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

      const model = buildModel(response);
      const history = new FormHistory(model);
      const [name] = model.getItems("name");

      name.setAnswer([{ valueString: "Bob" }]);
      history.captureState();

      history.undo();

      expect(name.answerValues).toEqual([{ valueString: "Alice" }]);

      history.dispose();
    });
  });
});
