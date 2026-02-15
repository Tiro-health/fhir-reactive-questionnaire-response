import { LitElement, html, css } from "lit";
import { SignalWatcher } from "@lit-labs/signals";
import { buildQuestionnaireResponse, optionDisplay } from "../src/index.js";
import type { QuestionnaireResponseModel, ResponseItem } from "../src/index.js";
import type { Questionnaire, QuestionnaireResponse } from "../src/model/types.js";

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
  `;

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

    const isCalculated = item.calculatedExpression !== null;

    return html`
      <div class="item ${item.enabled ? "" : "disabled"}">
        <label>${item.text}</label>
        ${this.renderInput(item, isCalculated)}
      </div>
    `;
  }

  private renderInput(item: ResponseItem, readonly: boolean): unknown {
    const answers = item.answer;

    switch (item.type) {
      case "boolean": {
        const checked = answers?.[0]?.valueBoolean ?? false;
        return html`<input type="checkbox" .checked=${checked} ?disabled=${readonly}
          @change=${(e: Event) => {
            item.setAnswer([{ valueBoolean: (e.target as HTMLInputElement).checked }]);
          }} />`;
      }
      case "decimal": {
        const val = answers?.[0]?.valueDecimal ?? "";
        return html`<input type="number" step="any" .value=${String(val)} ?readonly=${readonly}
          @input=${(e: Event) => {
            const n = parseFloat((e.target as HTMLInputElement).value);
            item.setAnswer(isNaN(n) ? [] : [{ valueDecimal: n }]);
          }} />`;
      }
      case "integer": {
        const val = answers?.[0]?.valueInteger ?? "";
        return html`<input type="number" step="1" .value=${String(val)} ?readonly=${readonly}
          @input=${(e: Event) => {
            const n = parseInt((e.target as HTMLInputElement).value, 10);
            item.setAnswer(isNaN(n) ? [] : [{ valueInteger: n }]);
          }} />`;
      }
      case "text": {
        const val = answers?.[0]?.valueString ?? "";
        return html`<textarea .value=${val} ?readonly=${readonly}
          @input=${(e: Event) => {
            item.setAnswer([{ valueString: (e.target as HTMLTextAreaElement).value }]);
          }}></textarea>`;
      }
      case "date": {
        const val = answers?.[0]?.valueDate ?? "";
        return html`<input type="date" .value=${val} ?readonly=${readonly}
          @input=${(e: Event) => {
            item.setAnswer([{ valueDate: (e.target as HTMLInputElement).value }]);
          }} />`;
      }
      case "choice":
      case "open-choice": {
        const selected = answers?.[0];
        return html`
          ${item.answerOptions.map((opt) => {
            const label = optionDisplay(opt.value);
            const checked =
              selected?.valueCoding?.code === opt.value.valueCoding?.code &&
              selected?.valueCoding?.system === opt.value.valueCoding?.system ||
              selected?.valueString === opt.value.valueString;
            return html`
              <div class="option ${opt.enabled ? "" : "option-disabled"}">
                <input type="radio" name="${item.linkId}" .checked=${checked}
                  ?disabled=${!opt.enabled || readonly}
                  @change=${() => { item.setAnswer([{ ...opt.value }]); }} />
                <label>${label}</label>
              </div>
            `;
          })}
        `;
      }
      default: {
        const val = answers?.[0]?.valueString ?? "";
        return html`<input type="text" .value=${val} ?readonly=${readonly}
          @input=${(e: Event) => {
            item.setAnswer([{ valueString: (e.target as HTMLInputElement).value }]);
          }} />`;
      }
    }
  }

  render() {
    return html`
      <h2>${this.heading}</h2>
      ${this.model.items.map((item) => this.renderItem(item))}
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
