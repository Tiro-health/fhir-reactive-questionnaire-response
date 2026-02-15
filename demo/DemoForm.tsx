import { useRef } from "react";
import {
  buildQuestionnaireResponse,
  optionDisplay,
} from "../src/index.js";
import type { QuestionnaireResponseModel, ResponseItem, AnswerValue } from "../src/index.js";
import type { AnswerOption } from "../src/model/AnswerOption.js";
import type { Questionnaire, QuestionnaireResponse } from "../src/model/types.js";
import { useComputed } from "./useComputed.js";

interface DemoFormProps {
  questionnaire: Questionnaire;
  response: QuestionnaireResponse;
}

export function DemoForm({ questionnaire, response }: DemoFormProps) {
  const modelRef = useRef<QuestionnaireResponseModel | undefined>(undefined);
  if (!modelRef.current) {
    modelRef.current = buildQuestionnaireResponse(questionnaire, response);
  }
  const model = modelRef.current;
  const heading = questionnaire.title ?? questionnaire.id ?? "Questionnaire";

  return (
    <div className="demo-form">
      <h2>{heading}</h2>
      {model.items.map((item) => (
        <ItemRenderer key={item.linkId} item={item} />
      ))}
      <h3>FHIR Output</h3>
      <FhirOutput model={model} />
    </div>
  );
}

function ItemRenderer({ item }: { item: ResponseItem }) {
  const enabled = useComputed(() => item.enabled);

  if (item.type === "group") {
    return (
      <fieldset className={`item ${enabled ? "" : "disabled"}`}>
        <legend>{item.text}</legend>
        {item.items.map((child) => (
          <ItemRenderer key={child.linkId} item={child} />
        ))}
      </fieldset>
    );
  }

  if (item.type === "display") {
    return (
      <p className={`item display-text ${enabled ? "" : "disabled"}`}>
        {item.text}
      </p>
    );
  }

  return (
    <div className={`item ${enabled ? "" : "disabled"}`}>
      <label>{item.text}</label>
      <InputRenderer item={item} />
    </div>
  );
}

function InputRenderer({ item }: { item: ResponseItem }) {
  const answers = useComputed(() => item.answer);
  const isCalculated = item.calculatedExpression !== null;

  switch (item.type) {
    case "boolean": {
      const checked = answers?.[0]?.valueBoolean ?? false;
      return (
        <input
          type="checkbox"
          checked={checked}
          disabled={isCalculated}
          onChange={(e) => {
            item.setAnswer([{ valueBoolean: e.target.checked }]);
          }}
        />
      );
    }
    case "decimal": {
      const val = answers?.[0]?.valueDecimal ?? "";
      return (
        <input
          type="number"
          step="any"
          value={String(val)}
          readOnly={isCalculated}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            item.setAnswer(isNaN(n) ? [] : [{ valueDecimal: n }]);
          }}
        />
      );
    }
    case "integer": {
      const val = answers?.[0]?.valueInteger ?? "";
      return (
        <input
          type="number"
          step="1"
          value={String(val)}
          readOnly={isCalculated}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            item.setAnswer(isNaN(n) ? [] : [{ valueInteger: n }]);
          }}
        />
      );
    }
    case "text": {
      const val = answers?.[0]?.valueString ?? "";
      return (
        <textarea
          value={val}
          readOnly={isCalculated}
          onChange={(e) => {
            item.setAnswer([{ valueString: e.target.value }]);
          }}
        />
      );
    }
    case "date": {
      const val = answers?.[0]?.valueDate ?? "";
      return (
        <input
          type="date"
          value={val}
          readOnly={isCalculated}
          onChange={(e) => {
            item.setAnswer([{ valueDate: e.target.value }]);
          }}
        />
      );
    }
    case "choice":
    case "open-choice": {
      const selected = answers?.[0];
      return (
        <>
          {item.answerOptions.map((opt) => (
            <ChoiceOption
              key={optionDisplay(opt.value)}
              option={opt}
              linkId={item.linkId}
              selected={selected}
              readOnly={isCalculated}
              onSelect={() => {
                item.setAnswer([{ ...opt.value }]);
              }}
            />
          ))}
        </>
      );
    }
    default: {
      const val = answers?.[0]?.valueString ?? "";
      return (
        <input
          type="text"
          value={val}
          readOnly={isCalculated}
          onChange={(e) => {
            item.setAnswer([{ valueString: e.target.value }]);
          }}
        />
      );
    }
  }
}

interface ChoiceOptionProps {
  option: AnswerOption;
  linkId: string;
  selected: AnswerValue | null | undefined;
  readOnly: boolean;
  onSelect: () => void;
}

function ChoiceOption({
  option,
  linkId,
  selected,
  readOnly,
  onSelect,
}: ChoiceOptionProps) {
  const enabled = useComputed(() => option.enabled);
  const label = optionDisplay(option.value);
  const checked =
    (selected?.valueCoding?.code === option.value.valueCoding?.code &&
      selected?.valueCoding?.system === option.value.valueCoding?.system) ||
    selected?.valueString === option.value.valueString;

  return (
    <div className={`option ${enabled ? "" : "option-disabled"}`}>
      <input
        type="radio"
        name={linkId}
        checked={checked}
        disabled={!enabled || readOnly}
        onChange={onSelect}
      />
      <label>{label}</label>
    </div>
  );
}

function FhirOutput({ model }: { model: QuestionnaireResponseModel }) {
  const fhir = useComputed(() => model.toFhir());
  return <pre>{JSON.stringify(fhir, null, 2)}</pre>;
}
