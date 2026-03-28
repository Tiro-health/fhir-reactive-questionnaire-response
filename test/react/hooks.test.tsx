/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { buildQuestionnaireResponse } from "../../src/build/build.js";
import { QuestionnaireResponseContext } from "../../src/react/context.js";
import {
  useQuestionnaireResponse,
  useResponseItem,
  useEnabled,
  useVisible,
  useAnswerValues,
  useAnswerOptions,
  useIssues,
  useOutcomeIssues,
  useVisibleChildren,
  useDirty,
  useTouched,
} from "../../src/react.js";
import type { Questionnaire } from "../../src/model/types.js";
import type { QuestionnaireResponseModel } from "../../src/model/QuestionnaireResponse.js";

const TOGGLE_EXT_URL =
  "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-answerOptionsToggleExpression";

const questionnaire: Questionnaire = {
  resourceType: "Questionnaire",
  id: "react-hooks-test",
  status: "active",
  item: [
    { linkId: "name", text: "Name", type: "string", required: true },
    {
      linkId: "conditional",
      text: "Conditional",
      type: "string",
      disabledDisplay: "hidden",
      enableWhen: [
        { question: "name", operator: "exists", answerBoolean: true },
      ],
    },
    {
      linkId: "parent",
      text: "Parent group",
      type: "group",
      item: [
        {
          linkId: "child-hidden",
          text: "Hidden child",
          type: "string",
          disabledDisplay: "hidden",
          enableWhen: [
            { question: "name", operator: "exists", answerBoolean: true },
          ],
        },
        {
          linkId: "child-always",
          text: "Always visible",
          type: "string",
        },
      ],
    },
    {
      linkId: "meds",
      text: "Medications",
      type: "coding",
      answerOption: [
        { valueCoding: { code: "aspirin", display: "Aspirin" } },
        { valueCoding: { code: "tylenol", display: "Tylenol" } },
      ],
      extension: [
        {
          url: TOGGLE_EXT_URL,
          extension: [
            {
              url: "option",
              valueCoding: { code: "aspirin", display: "Aspirin" },
            },
            {
              url: "expression",
              valueExpression: {
                language: "text/fhirpath",
                expression:
                  "%resource.item.where(linkId='name').answer.value.exists()",
              },
            },
          ],
        },
      ],
    },
  ],
};

function createWrapper(model: QuestionnaireResponseModel) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QuestionnaireResponseContext.Provider,
      { value: model },
      children,
    );
  };
}

describe("React hooks", () => {
  describe("useQuestionnaireResponse", () => {
    it("returns the model from context", () => {
      const model = buildQuestionnaireResponse(questionnaire);
      const { result } = renderHook(() => useQuestionnaireResponse(), {
        wrapper: createWrapper(model),
      });
      expect(result.current).toBe(model);
    });

    it("throws outside provider", () => {
      expect(() => {
        renderHook(() => useQuestionnaireResponse());
      }).toThrow("useQuestionnaireResponse must be used within");
    });
  });

  describe("useResponseItem", () => {
    it("returns item by linkId", () => {
      const model = buildQuestionnaireResponse(questionnaire);
      const { result } = renderHook(() => useResponseItem("name"), {
        wrapper: createWrapper(model),
      });
      expect(result.current?.linkId).toBe("name");
    });

    it("returns undefined for unknown linkId", () => {
      const model = buildQuestionnaireResponse(questionnaire);
      const { result } = renderHook(() => useResponseItem("unknown"), {
        wrapper: createWrapper(model),
      });
      expect(result.current).toBeUndefined();
    });
  });

  describe("useEnabled", () => {
    it("tracks enabled state reactively", () => {
      const model = buildQuestionnaireResponse(questionnaire);
      const conditional = model.getItems("conditional")[0];
      const name = model.getItems("name")[0];

      const { result } = renderHook(() => useEnabled(conditional), {
        wrapper: createWrapper(model),
      });

      expect(result.current).toBe(false);

      act(() => {
        name.setAnswer([{ valueString: "Alice" }]);
      });
      expect(result.current).toBe(true);
    });
  });

  describe("useVisible", () => {
    it("tracks visibility reactively", () => {
      const model = buildQuestionnaireResponse(questionnaire);
      const conditional = model.getItems("conditional")[0];
      const name = model.getItems("name")[0];

      const { result } = renderHook(() => useVisible(conditional), {
        wrapper: createWrapper(model),
      });

      // hidden because disabled + disabledDisplay="hidden"
      expect(result.current).toBe(false);

      act(() => {
        name.setAnswer([{ valueString: "Alice" }]);
      });
      expect(result.current).toBe(true);
    });
  });

  describe("useAnswerValues", () => {
    it("tracks answer changes", () => {
      const model = buildQuestionnaireResponse(questionnaire);
      const name = model.getItems("name")[0];

      const { result } = renderHook(() => useAnswerValues(name), {
        wrapper: createWrapper(model),
      });

      expect(result.current).toEqual([]);

      act(() => {
        name.setAnswer([{ valueString: "Bob" }]);
      });
      expect(result.current).toEqual([{ valueString: "Bob" }]);
    });
  });

  describe("useAnswerOptions", () => {
    it("returns filtered enabled options", () => {
      const model = buildQuestionnaireResponse(questionnaire);
      const meds = model.getItems("meds")[0];
      const name = model.getItems("name")[0];

      const { result } = renderHook(() => useAnswerOptions(meds), {
        wrapper: createWrapper(model),
      });

      // aspirin is toggled off (name has no answer)
      expect(result.current).toHaveLength(1);
      expect(result.current[0].value.valueCoding?.code).toBe("tylenol");

      act(() => {
        name.setAnswer([{ valueString: "test" }]);
      });
      expect(result.current).toHaveLength(2);
    });
  });

  describe("useIssues", () => {
    it("tracks issues reactively after applyOutcome", () => {
      const model = buildQuestionnaireResponse(questionnaire);
      const name = model.getItems("name")[0];

      const { result } = renderHook(() => useIssues(name), {
        wrapper: createWrapper(model),
      });

      expect(result.current).toHaveLength(0);

      act(() => {
        model.applyOutcome({
          resourceType: "OperationOutcome",
          issue: [
            {
              severity: "error",
              code: "required",
              diagnostics: "Name is required",
              expression: ["QuestionnaireResponse.item[0]"],
            },
          ],
        });
      });
      expect(result.current).toHaveLength(1);
      expect(result.current[0].severity).toBe("error");
    });
  });

  describe("useOutcomeIssues", () => {
    it("tracks unroutable issues", () => {
      const model = buildQuestionnaireResponse(questionnaire);

      const { result } = renderHook(() => useOutcomeIssues(), {
        wrapper: createWrapper(model),
      });

      expect(result.current).toHaveLength(0);

      act(() => {
        model.applyOutcome({
          resourceType: "OperationOutcome",
          issue: [
            {
              severity: "error",
              code: "business-rule",
              diagnostics: "Form-level error",
            },
          ],
        });
      });
      expect(result.current).toHaveLength(1);
    });
  });

  describe("useVisibleChildren", () => {
    it("returns only visible children", () => {
      const model = buildQuestionnaireResponse(questionnaire);
      const parent = model.getItems("parent")[0];

      const { result } = renderHook(() => useVisibleChildren(parent), {
        wrapper: createWrapper(model),
      });

      expect(result.current).toHaveLength(1);
      expect(result.current[0].linkId).toBe("child-always");
    });
  });

  describe("useDirty", () => {
    it("tracks dirty state", () => {
      const model = buildQuestionnaireResponse(questionnaire);
      const name = model.getItems("name")[0];

      const { result } = renderHook(() => useDirty(name), {
        wrapper: createWrapper(model),
      });

      expect(result.current).toBe(false);

      act(() => {
        name.setAnswer([{ valueString: "changed" }]);
      });
      expect(result.current).toBe(true);
    });
  });

  describe("useTouched", () => {
    it("tracks touched state", () => {
      const model = buildQuestionnaireResponse(questionnaire);
      const name = model.getItems("name")[0];

      const { result } = renderHook(() => useTouched(name), {
        wrapper: createWrapper(model),
      });

      expect(result.current).toBe(false);

      act(() => {
        name.markTouched();
      });
      expect(result.current).toBe(true);
    });
  });
});
