import { describe, it, expect } from "vitest";
import { buildQuestionnaireResponse } from "../../src/build/build.js";
import type { Questionnaire } from "../../src/model/types.js";

const questionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "grouped-form",
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

describe("grouped questionnaire serialization", () => {
  it("serializes items within a group", () => {
    const model = buildQuestionnaireResponse(questionnaire);

    const [firstName] = model.getItems("first-name");
    const [lastName] = model.getItems("last-name");
    firstName.setAnswer([{ valueString: "Alice" }]);
    lastName.setAnswer([{ valueString: "Smith" }]);

    const fhir = model.toFhir();
    const group = fhir.item!.find((i) => i.linkId === "demographics");

    expect(group?.item).toHaveLength(2);
    expect(
      group?.item?.find((i) => i.linkId === "first-name")?.answer?.[0]
        ?.valueString,
    ).toBe("Alice");
    expect(
      group?.item?.find((i) => i.linkId === "last-name")?.answer?.[0]
        ?.valueString,
    ).toBe("Smith");
  });

  it("serializes repeating group instances", () => {
    const model = buildQuestionnaireResponse(questionnaire);

    // Fill the first (default) instance
    const [medName1] = model.getItems("med-name");
    const [dosage1] = model.getItems("dosage");
    medName1.setAnswer([{ valueString: "Aspirin" }]);
    dosage1.setAnswer([{ valueString: "100mg" }]);

    // Add a second instance
    model.addItem("med-group");
    const medNames = model.getItems("med-name");
    const dosages = model.getItems("dosage");
    medNames[1].setAnswer([{ valueString: "Ibuprofen" }]);
    dosages[1].setAnswer([{ valueString: "200mg" }]);

    const fhir = model.toFhir();
    const medGroups = fhir.item!.filter((i) => i.linkId === "med-group");

    expect(medGroups).toHaveLength(2);
    expect(
      medGroups[0].item?.find((i) => i.linkId === "med-name")?.answer?.[0]
        ?.valueString,
    ).toBe("Aspirin");
    expect(
      medGroups[1].item?.find((i) => i.linkId === "med-name")?.answer?.[0]
        ?.valueString,
    ).toBe("Ibuprofen");
  });

  it("removes a repeating group instance", () => {
    const model = buildQuestionnaireResponse(questionnaire);

    model.addItem("med-group");
    const medGroups = model.getItems("med-group");
    expect(medGroups).toHaveLength(2);

    const idToRemove = medGroups[1].id!;
    model.removeItem(idToRemove);

    const fhir = model.toFhir();
    const serializedGroups = fhir.item!.filter(
      (i) => i.linkId === "med-group",
    );
    expect(serializedGroups).toHaveLength(1);
  });
});
