# Undo / Redo — Design & Usage

## Design

History is snapshot-based. Each snapshot is a full `QuestionnaireResponse` captured via `toFhir()` and stored as a JSON string. On undo/redo the model is rebuilt from the snapshot via `buildQuestionnaireResponse()`.

### Why full snapshots

- **Simple** — snapshot is `JSON.stringify(model.toFhir())`, restore is `buildQuestionnaireResponse(questionnaire, JSON.parse(snapshot))`. ~90 lines of implementation.
- **Structural changes work** — adding/removing repeating group instances is captured automatically because the snapshot includes the full item tree.
- **No stale references** — snapshots are plain FHIR JSON, not keyed by runtime object references.
- **Calculated expressions re-wire** — rebuilding the model re-establishes all signal wiring (enableWhen, calculated expressions, answer option toggles).

### Trade-off

The `model` reference changes on undo/redo. Consumers must read `history.model` rather than holding a stale reference. This works naturally with the React context provider pattern — update the context value and everything re-renders.

## API

```ts
import { FormHistory } from "fhir-reactive-questionnaire-response";

const history = new FormHistory(questionnaire, response?, { maxSize?: number });

history.model      // QuestionnaireResponseModel — changes on undo/redo
history.canUndo    // boolean
history.canRedo    // boolean

history.capture()  // snapshot current state (no-op if nothing changed)
history.undo()     // restore previous snapshot (rebuilds model)
history.redo()     // restore next snapshot (rebuilds model)
```

## When to call `capture()`

`capture()` is the consumer's responsibility. Call it when a **user intention** completes — not on every keystroke, and not on a timer.

### On blur — text inputs

The most common pattern. The user types a value, then leaves the field. One undo step for the whole edit.

```tsx
<input
  value={answerValues?.[0]?.valueString ?? ""}
  onChange={(e) => item.setAnswer([{ valueString: e.target.value }])}
  onBlur={() => history.capture()}
/>
```

### On discrete actions — selections, checkboxes, toggles

These complete in a single interaction. Capture immediately.

```tsx
function onSelect(coding: Coding) {
  item.setAnswer([{ valueCoding: coding }]);
  history.capture();
}
```

### On structural mutations — add/remove/reorder

Each structural change is a distinct user intention.

```tsx
function onAddRow() {
  history.model.addItem("medications");
  history.capture();
}

function onRemoveRow(id: string) {
  history.model.removeItem(id);
  history.capture();
}
```

### After programmatic bulk changes

Group multiple programmatic changes into a single undo step.

```tsx
for (const item of prefillData) {
  history.model.getItems(item.linkId)[0].setAnswer(item.answers);
}
history.capture(); // one undo step for the whole prefill
```

### Rule of thumb

| User action | When to capture |
|---|---|
| Typing in a text field | `onBlur` |
| Selecting a dropdown/radio/checkbox | Immediately after `setAnswer` |
| Adding a repeating group row | After `addItem` |
| Removing a row | After `removeItem` |
| Programmatic prefill | Once, after all changes |

**Do not** capture on every keystroke (one undo step per character) or on a timer (arbitrary cut points mid-edit).
