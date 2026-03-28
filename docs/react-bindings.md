# React Bindings

Thin React hooks that subscribe to TC39 Signals from the core library and trigger re-renders on change. Imported from a separate entry point to keep the core framework-agnostic.

```ts
import { useEnabled, useAnswerValues } from "fhir-reactive-questionnaire-response/react";
```

React >=18 is required (uses `useState` and `useEffect`). It is an optional peer dependency — the core library works without React.

## How it works

The bridge between TC39 Signals and React is `useSignalValue`:

```
useSignalValue(compute)
  │
  ├─ creates a Signal.Computed that runs `compute()`
  │   → auto-tracks every signal read during execution
  │
  ├─ creates a Signal.subtle.Watcher that observes the computed
  │   → when any tracked signal changes, the watcher fires
  │
  └─ watcher callback calls useState setter → React re-renders
      → during render, computed.get() returns the new value
```

All other hooks are one-line wrappers around `useSignalValue`. For example:

```ts
function useEnabled(item: ResponseItem): boolean {
  return useSignalValue(() => item.enabled);
}
```

This means every hook automatically tracks exactly the signals it reads — no manual dependency arrays, no over-subscription.

## Providing the model

Wrap your form tree in a context provider:

```tsx
import { buildQuestionnaireResponse } from "fhir-reactive-questionnaire-response";
import { QuestionnaireResponseContext } from "fhir-reactive-questionnaire-response/react";

function App() {
  const [model] = useState(() => buildQuestionnaireResponse(questionnaire, response));

  return (
    <QuestionnaireResponseContext.Provider value={model}>
      <MyForm />
    </QuestionnaireResponseContext.Provider>
  );
}
```

## Hook reference

### Context

| Hook | Returns | Description |
|---|---|---|
| `useQuestionnaireResponse()` | `QuestionnaireResponseModel` | Access the model from context. Throws outside a provider. |

### Item lookup

| Hook | Returns | Description |
|---|---|---|
| `useResponseItem(linkId)` | `ResponseItem \| undefined` | First item instance by linkId |
| `useResponseItemById(id)` | `ResponseItem \| undefined` | Item by unique instance ID |

### Reactive state

| Hook | Returns | Description |
|---|---|---|
| `useEnabled(item)` | `boolean` | enableWhen evaluation result |
| `useVisible(item)` | `boolean` | Visible = enabled OR disabledDisplay !== "hidden" |
| `useAnswerValues(item)` | `AnswerValue[] \| null` | Current answer values |
| `useAnswerEntries(item)` | `ResponseAnswer[]` | Answer entries with nested children (answer[].item[] pattern) |
| `useAnswerOptions(item)` | `AnswerOption[]` | Enabled answer options (filtered by toggle expressions) |
| `useValidation(item)` | `{ valid, errors }` | Validation state (required, answerConstraint) |
| `useVisibleChildren(item)` | `ResponseItem[]` | Visible child items |
| `useVisibleAnswerChildren(entry)` | `ResponseItem[]` | Visible children of a ResponseAnswer |
| `useDirty(item)` | `boolean` | Has the answer changed from its initial value? |
| `useTouched(item)` | `boolean` | Has the user interacted with this item? |

### Primitive

| Hook | Returns | Description |
|---|---|---|
| `useSignalValue(compute)` | `T` | Subscribe to any signal-derived value. Use this to read signals not covered by the built-in hooks. |

## Example: a text input

```tsx
import { useResponseItem, useAnswerValues, useValidation } from "fhir-reactive-questionnaire-response/react";

function TextInput({ linkId }: { linkId: string }) {
  const item = useResponseItem(linkId);
  if (!item) return null;

  const answers = useAnswerValues(item);
  const { valid, errors } = useValidation(item);
  const value = answers?.[0]?.valueString ?? "";

  return (
    <div>
      <label>{item.text}</label>
      <input
        value={value}
        readOnly={item.readOnly}
        onChange={(e) => item.setAnswer([{ valueString: e.target.value }])}
        onBlur={() => item.markTouched()}
      />
      {item.touched && !valid && (
        <span className="error">{errors[0]?.message}</span>
      )}
    </div>
  );
}
```

## Why not `useSyncExternalStore`?

The TC39 Signal polyfill throws `producerAccessed` errors when signals are read during `getSnapshot` in certain React render phases. The simpler `Watcher` + `useState` approach avoids this by separating notification (watcher callback sets state) from reading (computed.get() during render).
