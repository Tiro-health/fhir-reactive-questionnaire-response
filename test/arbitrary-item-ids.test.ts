import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../src/build/build.js";
import type {
  Questionnaire,
  QuestionnaireResponse,
} from "../src/model/types.js";

const questionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "id-test",
  status: "active",
  item: [
    {
      linkId: "name",
      text: "Name",
      type: "string",
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

describe("arbitrary item IDs", () => {
  it("preserves custom item IDs from hydrated response", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      questionnaire: "id-test",
      item: [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          linkId: "name",
          answer: [{ valueString: "Alice" }],
        },
        {
          id: "backend-generated-id-123",
          linkId: "notes",
          item: [
            {
              id: "child-id-abc",
              linkId: "note-text",
              answer: [{ valueString: "First note" }],
            },
          ],
        },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);

    const [name] = rqr.getItems("name");
    expect(name.id).toBe("550e8400-e29b-41d4-a716-446655440000");

    const [notes] = rqr.getItems("notes");
    expect(notes.id).toBe("backend-generated-id-123");

    const [noteText] = rqr.getItems("note-text");
    expect(noteText.id).toBe("child-id-abc");
  });

  it("retrieves items by arbitrary ID via getItemById", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      questionnaire: "id-test",
      item: [
        {
          id: "my-custom-uuid",
          linkId: "name",
          answer: [{ valueString: "Bob" }],
        },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const item = rqr.getItemById("my-custom-uuid");
    expect(item).toBeDefined();
    expect(item!.linkId).toBe("name");
    expect(item!.answerValues).toEqual([{ valueString: "Bob" }]);
  });

  it("preserves custom IDs in toFhir() output", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      questionnaire: "id-test",
      item: [
        {
          id: "custom-id-1",
          linkId: "name",
          answer: [{ valueString: "Carol" }],
        },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    const fhir = rqr.toFhir();
    expect(fhir.item?.[0].id).toBe("custom-id-1");
  });

  it("generates UUID for dynamically added items", () => {
    const rqr = buildQuestionnaireResponse(questionnaire);
    const newItem = rqr.addItem("notes");

    expect(newItem.id).toBeDefined();
    expect(newItem.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("removes items by arbitrary ID", () => {
    const response: QuestionnaireResponse = {
      resourceType: "QuestionnaireResponse",
      status: "in-progress",
      questionnaire: "id-test",
      item: [
        { linkId: "name" },
        {
          id: "remove-me-xyz",
          linkId: "notes",
          item: [{ linkId: "note-text" }],
        },
      ],
    };

    const rqr = buildQuestionnaireResponse(questionnaire, response);
    expect(rqr.getItemById("remove-me-xyz")).toBeDefined();

    rqr.removeItem("remove-me-xyz");
    expect(rqr.getItemById("remove-me-xyz")).toBeUndefined();
  });
});
