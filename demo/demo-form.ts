import { LitElement, html, css } from "lit";
import { SignalWatcher } from "@lit-labs/signals";
import { buildQuestionnaireResponse, optionDisplay } from "../src/index.js";
import type { QuestionnaireResponseModel, ResponseItem, ResponseAnswer, AnswerValue } from "../src/index.js";
import type { AnswerOption } from "../src/model/AnswerOption.js";
import type { QuestionnaireItemType, Questionnaire, QuestionnaireResponse } from "../src/model/types.js";

function emptyValue(type: QuestionnaireItemType): AnswerValue {
  switch (type) {
    case "boolean": return { valueBoolean: false };
    case "decimal": return { valueDecimal: 0 };
    case "integer": return { valueInteger: 0 };
    case "date": return { valueDate: "" };
    default: return { valueString: "" };
  }
}

class DemoForm extends SignalWatcher(LitElement) {
  static properties = {
    model: { attribute: false },
    heading: { type: String },
  };

  declare model: QuestionnaireResponseModel;
  declare heading: string;

  constructor() {
    super();
    this.heading = "";
  }

  static styles = css`
    :host {
      display: block;
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }
    h2 { margin-top: 0; }
    h3 { margin: 0; }
    .item { margin-bottom: 1rem; }
    .item.disabled { opacity: 0.4; pointer-events: none; }
    label { display: block; font-weight: 500; margin-bottom: 0.25rem; }
    input, textarea {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      font: inherit;
    }
    input[type="checkbox"] { width: auto; }
    input[readonly] { background: #f0f0f0; color: #555; }
    fieldset { border: 1px solid #ddd; border-radius: 4px; margin-bottom: 1rem; }
    legend { font-weight: 600; }
    .display-text { color: #555; font-style: italic; }
    .option { margin-bottom: 0.25rem; }
    .option.option-disabled { opacity: 0.4; }
    .option label { display: inline; font-weight: normal; }
    pre {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.8rem;
      max-height: 300px;
    }
    .repeating-group { margin-bottom: 1.5rem; }
    .repeating-group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }
    .group-instance { position: relative; }
    .group-instance-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .btn {
      border: none;
      border-radius: 4px;
      padding: 0.35rem 0.75rem;
      cursor: pointer;
      font: inherit;
      font-size: 0.85rem;
    }
    .btn-add { background: #e8f5e9; color: #2e7d32; }
    .btn-add:hover { background: #c8e6c9; }
    .btn-remove { background: #ffebee; color: #c62828; }
    .btn-remove:hover { background: #ffcdd2; }
    .btn-remove-sm {
      background: #ffebee; color: #c62828;
      padding: 0.35rem 0.5rem; font-size: 0.8rem;
      border: none; border-radius: 4px; cursor: pointer; flex-shrink: 0;
    }
    .btn-add-sm {
      background: #e8f5e9; color: #2e7d32;
      padding: 0.35rem 0.75rem; font-size: 0.8rem;
      border: none; border-radius: 4px; cursor: pointer;
    }
    .answer-entry {
      border: 1px solid #eee;
      border-radius: 4px;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      background: #fafafa;
    }
    .answer-entry-value {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .answer-entry-value input { flex: 1; }
    .answer-entry-children { padding-left: 0.5rem; }
    .empty-hint {
      color: #999; font-style: italic; font-size: 0.9rem; margin: 0.5rem 0;
    }
  `;

  private renderItems(items: ResponseItem[]): unknown {
    const rendered: unknown[] = [];
    const seenRepeatingGroups = new Set<string>();

    for (const item of items) {
      const def = this.model.definitions.get(item.linkId);
      const isRepeatingGroup = def?.type === "group" && def.repeats === true;

      if (isRepeatingGroup) {
        if (seenRepeatingGroups.has(item.linkId)) continue;
        seenRepeatingGroups.add(item.linkId);
        rendered.push(this.renderRepeatingGroup(item.linkId));
      } else {
        rendered.push(this.renderItem(item));
      }
    }

    return rendered;
  }

  private renderRepeatingGroup(linkId: string): unknown {
    const instances = this.model.getItems(linkId);
    const def = this.model.definitions.get(linkId);
    const label = def?.text ?? linkId;

    return html`
      <div class="repeating-group">
        <div class="repeating-group-header">
          <h3>${label}</h3>
          <button class="btn btn-add" @click=${() => this.model.addItem(linkId)}>
            + Add ${label}
          </button>
        </div>
        ${instances.map((instance) => html`
          <fieldset class="item group-instance ${instance.enabled ? "" : "disabled"}">
            <div class="group-instance-header">
              <legend>${instance.text}</legend>
              <button class="btn btn-remove"
                @click=${() => instance.id && this.model.removeItem(instance.id)}>
                Remove
              </button>
            </div>
            ${instance.items.map((child) => this.renderItem(child))}
          </fieldset>
        `)}
        ${instances.length === 0 ? html`
          <p class="empty-hint">No entries yet.</p>
        ` : ""}
      </div>
    `;
  }

  private renderItem(item: ResponseItem): unknown {
    if (item.type === "group") {
      return html`
        <fieldset class="item ${item.enabled ? "" : "disabled"}">
          <legend>${item.text}</legend>
          ${item.items.map((child) => this.renderItem(child))}
        </fieldset>
      `;
    }

    if (item.type === "display") {
      return html`<p class="item display-text ${item.enabled ? "" : "disabled"}">${item.text}</p>`;
    }

    if (item.hasAnswerItems) {
      return html`
        <div class="item ${item.enabled ? "" : "disabled"}">
          <label>${item.text}</label>
          ${this.renderAnswerEntries(item)}
        </div>
      `;
    }

    const isCalculated = item.calculatedExpression !== null;

    return html`
      <div class="item ${item.enabled ? "" : "disabled"}">
        <label>${item.text}</label>
        ${this.renderValueInput(item.type, item.answerValues?.[0], item.answerOptions, isCalculated, item.linkId,
          (v) => item.setAnswer(v ? [v] : []))}
      </div>
    `;
  }

  private renderAnswerEntries(item: ResponseItem): unknown {
    const entries = item.answerEntries;

    return html`
      <div class="answer-entries">
        ${entries.map((entry, idx) => this.renderAnswerEntry(entry, item, idx))}
        <button class="btn-add-sm"
          @click=${() => item.addAnswer(emptyValue(item.type))}>
          + Add
        </button>
      </div>
    `;
  }

  private renderAnswerEntry(entry: ResponseAnswer, item: ResponseItem, index: number): unknown {
    return html`
      <div class="answer-entry">
        <div class="answer-entry-value">
          ${this.renderValueInput(item.type, entry.value, item.answerOptions, false, item.linkId,
            (v) => { if (v) entry.setValue(v); })}
          <button class="btn-remove-sm"
            @click=${() => item.removeAnswer(index)}>x</button>
        </div>
        <div class="answer-entry-children">
          ${entry.items.map((child) => this.renderItem(child))}
        </div>
      </div>
    `;
  }

  private renderValueInput(
    type: QuestionnaireItemType,
    value: AnswerValue | undefined,
    answerOptions: AnswerOption[],
    readonly: boolean,
    linkId: string,
    onChange: (v: AnswerValue | null) => void,
  ): unknown {
    switch (type) {
      case "boolean": {
        const checked = value?.valueBoolean ?? false;
        return html`<input type="checkbox" .checked=${checked} ?disabled=${readonly}
          @change=${(e: Event) => onChange({ valueBoolean: (e.target as HTMLInputElement).checked })} />`;
      }
      case "decimal": {
        const val = value?.valueDecimal ?? "";
        return html`<input type="number" step="any" .value=${String(val)} ?readonly=${readonly}
          @input=${(e: Event) => {
            const n = parseFloat((e.target as HTMLInputElement).value);
            onChange(isNaN(n) ? null : { valueDecimal: n });
          }} />`;
      }
      case "integer": {
        const val = value?.valueInteger ?? "";
        return html`<input type="number" step="1" .value=${String(val)} ?readonly=${readonly}
          @input=${(e: Event) => {
            const n = parseInt((e.target as HTMLInputElement).value, 10);
            onChange(isNaN(n) ? null : { valueInteger: n });
          }} />`;
      }
      case "text": {
        const val = value?.valueString ?? "";
        return html`<textarea .value=${val} ?readonly=${readonly}
          @input=${(e: Event) => onChange({ valueString: (e.target as HTMLTextAreaElement).value })}></textarea>`;
      }
      case "date": {
        const val = value?.valueDate ?? "";
        return html`<input type="date" .value=${val} ?readonly=${readonly}
          @input=${(e: Event) => onChange({ valueDate: (e.target as HTMLInputElement).value })} />`;
      }
      case "coding": {
        return html`
          ${answerOptions.map((opt) => {
            const label = optionDisplay(opt.value);
            const checked =
              value?.valueCoding?.code === opt.value.valueCoding?.code &&
              value?.valueCoding?.system === opt.value.valueCoding?.system ||
              value?.valueString === opt.value.valueString;
            return html`
              <div class="option ${opt.enabled ? "" : "option-disabled"}">
                <input type="radio" name="${linkId}" .checked=${checked}
                  ?disabled=${!opt.enabled || readonly}
                  @change=${() => onChange({ ...opt.value })} />
                <label>${label}</label>
              </div>
            `;
          })}
        `;
      }
      default: {
        const val = value?.valueString ?? "";
        return html`<input type="text" .value=${val} ?readonly=${readonly}
          @input=${(e: Event) => onChange({ valueString: (e.target as HTMLInputElement).value })} />`;
      }
    }
  }

  render() {
    return html`
      <h2>${this.heading}</h2>
      ${this.renderItems(this.model.items)}
      <h3>FHIR Output</h3>
      <pre>${JSON.stringify(this.model.toFhir(), null, 2)}</pre>
    `;
  }
}
customElements.define("demo-form", DemoForm);

export function createForm(
  questionnaire: Questionnaire,
  response: QuestionnaireResponse,
): DemoForm {
  const el = document.createElement("demo-form") as DemoForm;
  el.model = buildQuestionnaireResponse(questionnaire, response);
  el.heading = questionnaire.title ?? questionnaire.id ?? "Questionnaire";
  return el;
}
