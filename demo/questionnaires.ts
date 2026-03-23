import type { Questionnaire, QuestionnaireResponse } from "../src/model/types.js";

export { bmiQuestionnaire, emptyBmiResponse } from "../test/fixtures/bmi-questionnaire.js";

export const allergyQuestionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "allergy-screening",
  status: "active",
  title: "Allergy Screening",
  item: [
    {
      linkId: "has-allergies",
      text: "Do you have allergies?",
      type: "boolean",
    },
    {
      linkId: "allergy-description",
      text: "Describe your allergies",
      type: "string",
      enableWhen: [
        { question: "has-allergies", operator: "=", answerBoolean: true },
      ],
    },
    {
      linkId: "severity",
      text: "Severity (1-10)",
      type: "integer",
      enableWhen: [
        { question: "has-allergies", operator: "=", answerBoolean: true },
      ],
    },
    {
      linkId: "notes",
      text: "Additional notes",
      type: "string",
    },
  ],
};

export const emptyAllergyResponse: QuestionnaireResponse = {
  resourceType: "QuestionnaireResponse",
  status: "in-progress",
  questionnaire: "allergy-screening",
  item: [
    { linkId: "has-allergies" },
    { linkId: "allergy-description" },
    { linkId: "severity" },
    { linkId: "notes" },
  ],
};

export const medicationQuestionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "medication-selection",
  status: "active",
  title: "Medication Selection",
  item: [
    {
      linkId: "enable-nsaids",
      text: "Enable NSAIDs?",
      type: "boolean",
    },
    {
      linkId: "medication",
      text: "Select medication",
      type: "coding",
      answerOption: [
        {
          valueCoding: {
            system: "http://example.org/meds",
            code: "acetaminophen",
            display: "Acetaminophen",
          },
        },
        {
          valueCoding: {
            system: "http://example.org/meds",
            code: "aspirin",
            display: "Aspirin",
          },
        },
        {
          valueCoding: {
            system: "http://example.org/meds",
            code: "ibuprofen",
            display: "Ibuprofen",
          },
        },
      ],
      extension: [
        {
          url: "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-answerOptionsToggleExpression",
          extension: [
            {
              url: "option",
              valueCoding: {
                system: "http://example.org/meds",
                code: "aspirin",
                display: "Aspirin",
              },
            },
            {
              url: "option",
              valueCoding: {
                system: "http://example.org/meds",
                code: "ibuprofen",
                display: "Ibuprofen",
              },
            },
            {
              url: "expression",
              valueExpression: {
                language: "text/fhirpath",
                expression:
                  "%resource.item.where(linkId='enable-nsaids').answer.value = true",
              },
            },
          ],
        },
      ],
    },
  ],
};

export const emptyMedicationResponse: QuestionnaireResponse = {
  resourceType: "QuestionnaireResponse",
  status: "in-progress",
  questionnaire: "medication-selection",
  item: [
    { linkId: "enable-nsaids" },
    { linkId: "medication" },
  ],
};

export const patientIntakeQuestionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "patient-intake",
  status: "active",
  title: "Patient Intake",
  item: [
    {
      linkId: "patient-name",
      text: "Patient name",
      type: "string",
    },
    {
      linkId: "phone",
      text: "Phone number",
      type: "string",
      repeats: true,
      item: [
        {
          linkId: "phone-type",
          text: "Type",
          type: "coding",
          answerOption: [
            { valueCoding: { code: "home", display: "Home" } },
            { valueCoding: { code: "work", display: "Work" } },
            { valueCoding: { code: "mobile", display: "Mobile" } },
          ],
        },
      ],
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
        {
          linkId: "prescribed",
          text: "Taking as prescribed?",
          type: "boolean",
        },
        {
          linkId: "side-effects",
          text: "Describe side effects",
          type: "string",
          enableWhen: [
            { question: "prescribed", operator: "=", answerBoolean: true },
          ],
        },
      ],
    },
  ],
};

export const prefilledIntakeResponse: QuestionnaireResponse = {
  resourceType: "QuestionnaireResponse",
  status: "in-progress",
  questionnaire: "patient-intake",
  item: [
    { linkId: "patient-name", answer: [{ valueString: "Jane Doe" }] },
    {
      linkId: "phone",
      answer: [
        {
          valueString: "+1 555-0100",
          item: [
            { linkId: "phone-type", answer: [{ valueCoding: { code: "home", display: "Home" } }] },
          ],
        },
        {
          valueString: "+1 555-0200",
          item: [
            { linkId: "phone-type", answer: [{ valueCoding: { code: "work", display: "Work" } }] },
          ],
        },
      ],
    },
    {
      linkId: "med-group",
      id: "med-1",
      item: [
        { linkId: "med-name", answer: [{ valueString: "Aspirin" }] },
        { linkId: "dosage", answer: [{ valueString: "100mg daily" }] },
        { linkId: "prescribed", answer: [{ valueBoolean: true }] },
        { linkId: "side-effects" },
      ],
    },
  ],
};
