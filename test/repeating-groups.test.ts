import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../src/build/build.js";
import type {
  Questionnaire,
  QuestionnaireResponse,
} from "../src/model/types.js";

const medicationsQuestionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "medications",
  status: "active",
  item: [
    {
      linkId: "patient-name",
      text: "Patient name",
      type: "string",
    },
    {
      linkId: "med-group",
      text: "Medication",
      type: "group",
      repeats: true,
      item: [
        {
          linkId: "med-name",
          text: "Medication name",
          type: "string",
        },
        {
          linkId: "dosage",
          text: "Dosage",
          type: "string",
        },
      ],
    },
  ],
};

const nonRepeatingGroupQuestionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "single-group",
  status: "active",
  item: [
    {
      linkId: "vitals",
      text: "Vitals",
      type: "group",
      repeats: false,
      item: [
        { linkId: "bp", text: "Blood pressure", type: "string" },
      ],
    },
  ],
};

const repeatingStringQuestionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "phone-list",
  status: "active",
  item: [
    {
      linkId: "phone",
      text: "Phone number",
      type: "string",
      repeats: true,
    },
  ],
};

const enableWhenRepeatingQuestionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "conditional-meds",
  status: "active",
  item: [
    {
      linkId: "takes-meds",
      text: "Do you take medications?",
      type: "boolean",
    },
    {
      linkId: "med-group",
      text: "Medication",
      type: "group",
      repeats: true,
      enableWhen: [
        {
          question: "takes-meds",
          operator: "=",
          answerBoolean: true,
        },
      ],
      item: [
        { linkId: "med-name", text: "Medication name", type: "string" },
      ],
    },
  ],
};

const filledMedsResponse: QuestionnaireResponse = {
  resourceType: "QuestionnaireResponse",
  status: "in-progress",
  item: [
    { linkId: "patient-name", answer: [{ valueString: "John" }] },
    {
      linkId: "med-group",
      id: "med-1",
      item: [
        { linkId: "med-name", id: "name-1", answer: [{ valueString: "Aspirin" }] },
        { linkId: "dosage", id: "dosage-1", answer: [{ valueString: "100mg" }] },
      ],
    },
    {
      linkId: "med-group",
      id: "med-2",
      item: [
        { linkId: "med-name", id: "name-2", answer: [{ valueString: "Ibuprofen" }] },
        { linkId: "dosage", id: "dosage-2", answer: [{ valueString: "200mg" }] },
      ],
    },
  ],
};

describe("Repeating Groups", () => {
  describe("addItem", () => {
    it("creates a new empty group instance with children", () => {
      const model = buildQuestionnaireResponse(medicationsQuestionnaire);
      const initialCount = model.getItems("med-group").length;

      const newGroup = model.addItem("med-group");

      expect(model.getItems("med-group").length).toBe(initialCount + 1);
      expect(newGroup.linkId).toBe("med-group");
      expect(newGroup.type).toBe("group");
      expect(newGroup.id).toBeDefined();
      // Children are created from the definition
      expect(newGroup.items.length).toBe(2);
      expect(newGroup.items[0].linkId).toBe("med-name");
      expect(newGroup.items[1].linkId).toBe("dosage");
      expect(newGroup.items[0].answer).toEqual([]);
      expect(newGroup.items[1].answer).toEqual([]);
    });

    it("creates a group instance with initial child answers", () => {
      const model = buildQuestionnaireResponse(medicationsQuestionnaire);

      const newGroup = model.addItem("med-group", {
        linkId: "med-group",
        item: [
          { linkId: "med-name", answer: [{ valueString: "Paracetamol" }] },
          { linkId: "dosage", answer: [{ valueString: "500mg" }] },
        ],
      });

      expect(newGroup.items[0].answer).toEqual([{ valueString: "Paracetamol" }]);
      expect(newGroup.items[1].answer).toEqual([{ valueString: "500mg" }]);
    });

    it("generates unique IDs for each new instance", () => {
      const model = buildQuestionnaireResponse(medicationsQuestionnaire);

      const group1 = model.addItem("med-group");
      const group2 = model.addItem("med-group");

      expect(group1.id).toBeDefined();
      expect(group2.id).toBeDefined();
      expect(group1.id).not.toBe(group2.id);
    });

    it("preserves a provided ID from the initial response item", () => {
      const model = buildQuestionnaireResponse(medicationsQuestionnaire);

      const newGroup = model.addItem("med-group", {
        linkId: "med-group",
        id: "my-custom-id",
      });

      expect(newGroup.id).toBe("my-custom-id");
    });

    it("registers the new group and its children in indexes", () => {
      const model = buildQuestionnaireResponse(medicationsQuestionnaire);

      const newGroup = model.addItem("med-group");

      expect(model.getItems("med-group")).toContain(newGroup);
      expect(model.getItemById(newGroup.id!)).toBe(newGroup);
      // Children should also be registered
      for (const child of newGroup.items) {
        expect(model.getItems(child.linkId)).toContain(child);
      }
    });

    it("throws when adding a non-group repeating item (use setAnswer instead)", () => {
      const model = buildQuestionnaireResponse(repeatingStringQuestionnaire);

      expect(() => model.addItem("phone")).toThrow(/Only repeating groups/i);
    });

    it("throws when adding a non-repeating group", () => {
      const model = buildQuestionnaireResponse(nonRepeatingGroupQuestionnaire);

      expect(() => model.addItem("vitals")).toThrow(/repeats/i);
    });

    it("throws for unknown linkId", () => {
      const model = buildQuestionnaireResponse(medicationsQuestionnaire);

      expect(() => model.addItem("nonexistent")).toThrow(/definition/i);
    });

    it("appends to existing groups", () => {
      const model = buildQuestionnaireResponse(
        medicationsQuestionnaire,
        filledMedsResponse,
      );

      expect(model.getItems("med-group").length).toBe(2);

      const newGroup = model.addItem("med-group");

      expect(model.getItems("med-group").length).toBe(3);
      const allItems = model.items;
      expect(allItems[allItems.length - 1]).toBe(newGroup);
    });
  });

  describe("removeItem", () => {
    it("removes a group instance by ID", () => {
      const model = buildQuestionnaireResponse(
        medicationsQuestionnaire,
        filledMedsResponse,
      );

      expect(model.getItems("med-group").length).toBe(2);

      model.removeItem("med-1");

      expect(model.getItems("med-group").length).toBe(1);
      expect(model.getItemById("med-1")).toBeUndefined();
    });

    it("removes the group from the parent's items list", () => {
      const model = buildQuestionnaireResponse(
        medicationsQuestionnaire,
        filledMedsResponse,
      );

      const before = model.items.length;
      model.removeItem("med-1");

      expect(model.items.length).toBe(before - 1);
      expect(model.items.find((i) => i.id === "med-1")).toBeUndefined();
    });

    it("throws for unknown item ID", () => {
      const model = buildQuestionnaireResponse(medicationsQuestionnaire);

      expect(() => model.removeItem("nonexistent")).toThrow(/No item found/i);
    });

    it("unregisters children from indexes when removing a group", () => {
      const model = buildQuestionnaireResponse(
        medicationsQuestionnaire,
        filledMedsResponse,
      );

      expect(model.getItemById("name-1")).toBeDefined();
      expect(model.getItemById("dosage-1")).toBeDefined();

      model.removeItem("med-1");

      expect(model.getItemById("med-1")).toBeUndefined();
      expect(model.getItemById("name-1")).toBeUndefined();
      expect(model.getItemById("dosage-1")).toBeUndefined();
    });

    it("removes a dynamically added group", () => {
      const model = buildQuestionnaireResponse(medicationsQuestionnaire);

      const newGroup = model.addItem("med-group");
      const id = newGroup.id!;
      expect(model.getItemById(id)).toBe(newGroup);

      model.removeItem(id);

      expect(model.getItemById(id)).toBeUndefined();
      expect(model.getItems("med-group")).not.toContain(newGroup);
    });
  });

  describe("moveItem", () => {
    it("reorders group instances", () => {
      const model = buildQuestionnaireResponse(medicationsQuestionnaire, {
        resourceType: "QuestionnaireResponse",
        status: "in-progress",
        item: [
          { linkId: "med-group", id: "g1", item: [{ linkId: "med-name", answer: [{ valueString: "A" }] }, { linkId: "dosage" }] },
          { linkId: "med-group", id: "g2", item: [{ linkId: "med-name", answer: [{ valueString: "B" }] }, { linkId: "dosage" }] },
          { linkId: "med-group", id: "g3", item: [{ linkId: "med-name", answer: [{ valueString: "C" }] }, { linkId: "dosage" }] },
        ],
      });

      // Move first group to last position
      model.moveItem("med-group", 0, 2);

      const groups = model.getItems("med-group");
      expect(groups[0].id).toBe("g2");
      expect(groups[1].id).toBe("g3");
      expect(groups[2].id).toBe("g1");
    });

    it("no-ops when fromIndex equals toIndex", () => {
      const model = buildQuestionnaireResponse(
        medicationsQuestionnaire,
        filledMedsResponse,
      );

      const before = model.items.map((i) => i.id);
      model.moveItem("med-group", 0, 0);
      const after = model.items.map((i) => i.id);

      expect(after).toEqual(before);
    });

    it("throws for out-of-range indices", () => {
      const model = buildQuestionnaireResponse(
        medicationsQuestionnaire,
        filledMedsResponse,
      );

      expect(() => model.moveItem("med-group", -1, 0)).toThrow(/out of range/i);
      expect(() => model.moveItem("med-group", 0, 5)).toThrow(/out of range/i);
    });

    it("preserves non-matching items between moved groups", () => {
      const model = buildQuestionnaireResponse(
        medicationsQuestionnaire,
        filledMedsResponse,
      );

      // patient-name is at index 0, med groups at 1 and 2
      model.moveItem("med-group", 0, 1);

      // patient-name should still be first
      expect(model.items[0].linkId).toBe("patient-name");
    });
  });

  describe("toFhir() reflects mutations", () => {
    it("includes added groups", () => {
      const model = buildQuestionnaireResponse(medicationsQuestionnaire);

      model.addItem("med-group", {
        linkId: "med-group",
        item: [
          { linkId: "med-name", answer: [{ valueString: "Aspirin" }] },
          { linkId: "dosage", answer: [{ valueString: "100mg" }] },
        ],
      });

      const fhir = model.toFhir();
      const medGroups = fhir.item?.filter((i) => i.linkId === "med-group");

      // The original empty one + new one
      expect(medGroups?.length).toBe(2);
      const addedGroup = medGroups?.find(
        (g) => g.item?.some((c) => c.answer?.[0]?.valueString === "Aspirin"),
      );
      expect(addedGroup).toBeDefined();
    });

    it("excludes removed groups", () => {
      const model = buildQuestionnaireResponse(
        medicationsQuestionnaire,
        filledMedsResponse,
      );

      model.removeItem("med-1");

      const fhir = model.toFhir();
      const medGroups = fhir.item?.filter((i) => i.linkId === "med-group");

      expect(medGroups?.length).toBe(1);
      expect(medGroups?.[0]?.id).toBe("med-2");
    });

    it("reflects reordered groups", () => {
      const model = buildQuestionnaireResponse(
        medicationsQuestionnaire,
        filledMedsResponse,
      );

      model.moveItem("med-group", 0, 1);

      const fhir = model.toFhir();
      const medGroups = fhir.item?.filter((i) => i.linkId === "med-group");

      expect(medGroups?.[0]?.id).toBe("med-2");
      expect(medGroups?.[1]?.id).toBe("med-1");
    });
  });

  describe("enableWhen on repeating groups", () => {
    it("dynamically added group inherits enableWhen signal wiring", () => {
      const model = buildQuestionnaireResponse(enableWhenRepeatingQuestionnaire);

      const [takesMeds] = model.getItems("takes-meds");
      const [existingGroup] = model.getItems("med-group");

      // Initially disabled
      expect(existingGroup.enabled).toBe(false);

      // Enable
      takesMeds.setAnswer([{ valueBoolean: true }]);
      expect(existingGroup.enabled).toBe(true);

      // Add a new group — should also be enabled
      const newGroup = model.addItem("med-group");
      expect(newGroup.enabled).toBe(true);

      // Disable — both should become disabled
      takesMeds.setAnswer([{ valueBoolean: false }]);
      expect(existingGroup.enabled).toBe(false);
      expect(newGroup.enabled).toBe(false);
    });
  });

  describe("ResponseItem.addItem (nested)", () => {
    it("is not supported at ResponseItem level for top-level groups", () => {
      // addItem on a ResponseItem delegates to the same logic,
      // allowing nested repeating groups within a parent group
      const nestedQuestionnaire: Questionnaire = {
        resourceType: "Questionnaire",
        id: "nested",
        status: "active",
        item: [
          {
            linkId: "outer",
            text: "Outer group",
            type: "group",
            item: [
              {
                linkId: "inner",
                text: "Inner repeating group",
                type: "group",
                repeats: true,
                item: [
                  { linkId: "value", text: "Value", type: "string" },
                ],
              },
            ],
          },
        ],
      };

      const model = buildQuestionnaireResponse(nestedQuestionnaire);
      const [outer] = model.getItems("outer");

      expect(outer.items.filter((i) => i.linkId === "inner").length).toBe(1);

      const newInner = outer.addItem("inner");

      expect(outer.items.filter((i) => i.linkId === "inner").length).toBe(2);
      expect(newInner.items[0].linkId).toBe("value");
    });
  });

  describe("hydration of existing repeating groups", () => {
    it("hydrates multiple group instances from response", () => {
      const model = buildQuestionnaireResponse(
        medicationsQuestionnaire,
        filledMedsResponse,
      );

      const groups = model.getItems("med-group");
      expect(groups.length).toBe(2);
      expect(groups[0].items[0].answer).toEqual([{ valueString: "Aspirin" }]);
      expect(groups[1].items[0].answer).toEqual([{ valueString: "Ibuprofen" }]);
    });
  });

  describe("definitions map", () => {
    it("populates definitions for all items including nested", () => {
      const model = buildQuestionnaireResponse(medicationsQuestionnaire);

      expect(model.definitions.has("patient-name")).toBe(true);
      expect(model.definitions.has("med-group")).toBe(true);
      expect(model.definitions.has("med-name")).toBe(true);
      expect(model.definitions.has("dosage")).toBe(true);
      expect(model.definitions.get("med-group")?.repeats).toBe(true);
      expect(model.definitions.get("med-group")?.type).toBe("group");
    });
  });
});
