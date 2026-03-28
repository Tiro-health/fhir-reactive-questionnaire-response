import type { Questionnaire, QuestionnaireResponse } from "./model/types.js";
import type { QuestionnaireResponseModel } from "./model/QuestionnaireResponse.js";
import { buildQuestionnaireResponse } from "./build/build.js";

export interface FormHistoryOptions {
  maxSize?: number;
}

/**
 * Undo/redo history for a QuestionnaireResponse form.
 *
 * Snapshots are full QuestionnaireResponse FHIR resources captured via
 * `toFhir()`. On undo/redo the model is rebuilt from the snapshot, so
 * all signal wiring (enableWhen, calculated expressions, answer option
 * toggles) is re-established automatically.
 *
 * The `model` reference changes on undo/redo — consumers should read it
 * from the history instance rather than holding a stale reference.
 */
export class FormHistory {
  readonly #questionnaire: Questionnaire;
  readonly #maxSize: number;

  readonly #past: string[] = [];
  readonly #future: string[] = [];
  #current: string;
  #model: QuestionnaireResponseModel;

  constructor(
    questionnaire: Questionnaire,
    response?: QuestionnaireResponse,
    options?: FormHistoryOptions,
  ) {
    this.#questionnaire = questionnaire;
    this.#maxSize = options?.maxSize ?? 50;
    this.#model = buildQuestionnaireResponse(questionnaire, response);
    this.#current = JSON.stringify(this.#model.toFhir());
  }

  /** The current reactive model. Changes on undo/redo. */
  get model(): QuestionnaireResponseModel {
    return this.#model;
  }

  get canUndo(): boolean {
    return this.#past.length > 0;
  }

  get canRedo(): boolean {
    return this.#future.length > 0;
  }

  /**
   * Capture the current form state as an undo point.
   * No-op if nothing changed since the last capture.
   */
  capture(): void {
    const snapshot = JSON.stringify(this.#model.toFhir());
    if (snapshot === this.#current) return;

    this.#past.push(this.#current);
    if (this.#past.length > this.#maxSize) {
      this.#past.shift();
    }
    this.#current = snapshot;
    this.#future.length = 0;
  }

  /** Restore the previous state. No-op if nothing to undo. */
  undo(): void {
    if (this.#past.length === 0) return;
    this.#future.push(this.#current);
    this.#current = this.#past.pop()!;
    this.#rebuild();
  }

  /** Re-apply the next state. No-op if nothing to redo. */
  redo(): void {
    if (this.#future.length === 0) return;
    this.#past.push(this.#current);
    this.#current = this.#future.pop()!;
    this.#rebuild();
  }

  #rebuild(): void {
    this.#model = buildQuestionnaireResponse(
      this.#questionnaire,
      JSON.parse(this.#current) as QuestionnaireResponse,
    );
  }
}
