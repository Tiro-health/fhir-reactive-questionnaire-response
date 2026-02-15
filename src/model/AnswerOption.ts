import { Signal } from "@lit-labs/signals";
import type { AnswerValue, Coding } from "./types.js";

export class AnswerOption {
  readonly value: AnswerValue;
  readonly initialSelected: boolean;
  readonly #enabled: Signal.Computed<boolean>;

  constructor(
    value: AnswerValue,
    initialSelected: boolean,
    enabled: Signal.Computed<boolean>,
  ) {
    this.value = value;
    this.initialSelected = initialSelected;
    this.#enabled = enabled;
  }

  get enabled(): boolean {
    return this.#enabled.get();
  }
}

export function optionDisplay(value: AnswerValue): string {
  if (value.valueCoding) {
    return codingDisplay(value.valueCoding);
  }
  if (value.valueString !== undefined) return value.valueString;
  if (value.valueInteger !== undefined) return String(value.valueInteger);
  if (value.valueDecimal !== undefined) return String(value.valueDecimal);
  if (value.valueBoolean !== undefined) return String(value.valueBoolean);
  if (value.valueDate !== undefined) return value.valueDate;
  if (value.valueDateTime !== undefined) return value.valueDateTime;
  if (value.valueTime !== undefined) return value.valueTime;
  if (value.valueUri !== undefined) return value.valueUri;
  return "";
}

function codingDisplay(coding: Coding): string {
  return coding.display ?? coding.code ?? "";
}
