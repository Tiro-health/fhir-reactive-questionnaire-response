import { useRef } from "react";
import {
  buildQuestionnaireResponse,
  optionDisplay,
} from "../src/index.js";
import type {
  QuestionnaireResponseModel,
  ResponseItem,
  AnswerValue,
} from "../src/index.js";
import type { AnswerOption } from "../src/model/AnswerOption.js";
import type { QuestionnaireItemType, Questionnaire, QuestionnaireResponse } from "../src/model/types.js";
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
      <ItemList items={model.items} model={model} />
      <h3>FHIR Output</h3>
      <FhirOutput model={model} />
    </div>
  );
}

function ItemList({ items, model }: { items: ResponseItem[]; model: QuestionnaireResponseModel }) {
  const allItems = useComputed(() => items);

  const rendered: JSX.Element[] = [];
  const seenRepeatingGroups = new Set<string>();

  for (const item of allItems ?? []) {
    const def = model.definitions.get(item.linkId);
    const isRepeatingGroup = def?.type === "group" && def.repeats === true;

    if (isRepeatingGroup) {
      if (seenRepeatingGroups.has(item.linkId)) continue;
      seenRepeatingGroups.add(item.linkId);
      rendered.push(
        <RepeatingGroupRenderer
          key={`rg-${item.linkId}`}
          linkId={item.linkId}
          model={model}
        />,
      );
    } else {
      rendered.push(
        <ItemRenderer key={item.id ?? item.linkId} item={item} model={model} />,
      );
    }
  }

  return <>{rendered}</>;
}

function RepeatingGroupRenderer({
  linkId,
  model,
}: {
  linkId: string;
  model: QuestionnaireResponseModel;
}) {
  const instances = useComputed(() => model.getItems(linkId));
  const def = model.definitions.get(linkId);
  const label = def?.text ?? linkId;

  return (
    <div className="repeating-group">
      <div className="repeating-group-header">
        <h3>{label}</h3>
        <button className="btn btn-add" onClick={() => model.addItem(linkId)}>
          + Add {label}
        </button>
      </div>
      {(instances ?? []).map((instance) => (
        <GroupInstanceRenderer
          key={instance.id ?? instance.linkId}
          item={instance}
          model={model}
          onRemove={() => instance.id && model.removeItem(instance.id)}
        />
      ))}
      {(instances ?? []).length === 0 && (
        <p className="empty-hint">No entries yet.</p>
      )}
    </div>
  );
}

function GroupInstanceRenderer({
  item,
  model,
  onRemove,
}: {
  item: ResponseItem;
  model: QuestionnaireResponseModel;
  onRemove: () => void;
}) {
  const enabled = useComputed(() => item.enabled);

  return (
    <fieldset className={`item group-instance ${enabled ? "" : "disabled"}`}>
      <div className="group-instance-header">
        <legend>{item.text}</legend>
        <button className="btn btn-remove" onClick={onRemove}>Remove</button>
      </div>
      {item.items.map((child) => (
        <ItemRenderer key={child.id ?? child.linkId} item={child} model={model} />
      ))}
    </fieldset>
  );
}

function ItemRenderer({ item, model }: { item: ResponseItem; model: QuestionnaireResponseModel }) {
  const enabled = useComputed(() => item.enabled);

  if (item.type === "group") {
    return (
      <fieldset className={`item ${enabled ? "" : "disabled"}`}>
        <legend>{item.text}</legend>
        {item.items.map((child) => (
          <ItemRenderer key={child.id ?? child.linkId} item={child} model={model} />
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

  if (item.hasAnswerItems) {
    return (
      <div className={`item ${enabled ? "" : "disabled"}`}>
        <label>{item.text}</label>
        <AnswerEntriesRenderer item={item} model={model} />
      </div>
    );
  }

  const isCalculated = item.calculatedExpression !== null;

  return (
    <div className={`item ${enabled ? "" : "disabled"}`}>
      <label>{item.text}</label>
      <ValueInput
        type={item.type}
        value={useComputed(() => item.answerValues)?.[0]}
        answerOptions={item.answerOptions}
        readOnly={isCalculated}
        linkId={item.linkId}
        onChange={(v) => item.setAnswer(v ? [v] : [])}
      />
    </div>
  );
}

function AnswerEntriesRenderer({
  item,
  model,
}: {
  item: ResponseItem;
  model: QuestionnaireResponseModel;
}) {
  const entries = useComputed(() => item.answerEntries);

  return (
    <div className="answer-entries">
      {(entries ?? []).map((entry, idx) => (
        <div key={idx} className="answer-entry">
          <div className="answer-entry-value">
            <ValueInput
              type={item.type}
              value={useComputed(() => entry.value)}
              answerOptions={item.answerOptions}
              readOnly={false}
              linkId={item.linkId}
              onChange={(v) => { if (v) entry.setValue(v); }}
            />
            <button
              className="btn btn-remove-sm"
              onClick={() => item.removeAnswer(idx)}
            >
              x
            </button>
          </div>
          <div className="answer-entry-children">
            {entry.items.map((child) => (
              <ItemRenderer key={child.id ?? child.linkId} item={child} model={model} />
            ))}
          </div>
        </div>
      ))}
      <button
        className="btn btn-add-sm"
        onClick={() => item.addAnswer(emptyValue(item.type))}
      >
        + Add
      </button>
    </div>
  );
}

interface ValueInputProps {
  type: QuestionnaireItemType;
  value: AnswerValue | undefined;
  answerOptions: AnswerOption[];
  readOnly: boolean;
  linkId: string;
  onChange: (value: AnswerValue | null) => void;
}

function ValueInput({ type, value, answerOptions, readOnly, linkId, onChange }: ValueInputProps) {
  switch (type) {
    case "boolean":
      return (
        <input
          type="checkbox"
          checked={value?.valueBoolean ?? false}
          disabled={readOnly}
          onChange={(e) => onChange({ valueBoolean: e.target.checked })}
        />
      );
    case "decimal":
      return (
        <input
          type="number"
          step="any"
          value={String(value?.valueDecimal ?? "")}
          readOnly={readOnly}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onChange(isNaN(n) ? null : { valueDecimal: n });
          }}
        />
      );
    case "integer":
      return (
        <input
          type="number"
          step="1"
          value={String(value?.valueInteger ?? "")}
          readOnly={readOnly}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            onChange(isNaN(n) ? null : { valueInteger: n });
          }}
        />
      );
    case "text":
      return (
        <textarea
          value={value?.valueString ?? ""}
          readOnly={readOnly}
          onChange={(e) => onChange({ valueString: e.target.value })}
        />
      );
    case "date":
      return (
        <input
          type="date"
          value={value?.valueDate ?? ""}
          readOnly={readOnly}
          onChange={(e) => onChange({ valueDate: e.target.value })}
        />
      );
    case "coding":
      return (
        <>
          {answerOptions.map((opt) => (
            <ChoiceOption
              key={optionDisplay(opt.value)}
              option={opt}
              linkId={linkId}
              selected={value}
              readOnly={readOnly}
              onSelect={() => onChange({ ...opt.value })}
            />
          ))}
        </>
      );
    default:
      return (
        <input
          type="text"
          value={value?.valueString ?? ""}
          readOnly={readOnly}
          onChange={(e) => onChange({ valueString: e.target.value })}
        />
      );
  }
}

function emptyValue(type: QuestionnaireItemType): AnswerValue {
  switch (type) {
    case "boolean": return { valueBoolean: false };
    case "decimal": return { valueDecimal: 0 };
    case "integer": return { valueInteger: 0 };
    case "date": return { valueDate: "" };
    default: return { valueString: "" };
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
