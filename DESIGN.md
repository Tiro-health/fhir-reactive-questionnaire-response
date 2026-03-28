# Form State Manager — Design Note

> Consolidation of the [Notion backlog entry](https://www.notion.so/311bd303e1d8804f9498d55a023b2e22) and the Obsidian gap analysis (2026-02-23). Updated 2026-03-28.

## Problem

We are hitting the limits of third-party form libraries:

1. **Data format mismatch** — Form libraries work with their own data format, requiring constant conversion to/from FHIR. This makes advanced FHIR features hard to support.
2. **SDC complexity** — FHIR Questionnaire and the SDC IG involve specific logic (enableWhen cascading, calculated expressions, repeating groups) that off-the-shelf form libraries don't handle.
3. **Framework coupling** — Most form libraries are tied to a specific UI framework, conflicting with our technology-agnostic SDK approach.

## Approach

The core library is framework-agnostic, built on TC39 Signals (`@lit-labs/signals`). Framework bindings are provided as separate entry points (e.g., `fhir-reactive-questionnaire-response/react`). Migration from the current report-renderer is incremental — React hooks wrap existing logic now (v1) and swap to signal-backed implementations later (v2) without changing renderer code.

## Architecture

- **Model** (`src/model/`) — `ResponseItem` tree with reactive signals for answers, enabled state, validation
- **Build** (`src/build/`) — `buildQuestionnaireResponse()` factory that wires the signal graph from a Questionnaire + optional QuestionnaireResponse
- **R4 compat** (`src/r4/`) — Bidirectional transforms between FHIR R4 and R5 types. Internal model is R5-native.
- **History** (`src/history.ts`) — Undo/redo via full QuestionnaireResponse snapshots. See [docs/undo-redo.md](docs/undo-redo.md).
- **React bindings** (`src/react/`) — Thin hooks that subscribe to signals via `Signal.subtle.Watcher` + `useState`. Optional peer dependency.

## Feature Matrix

### Implemented

- [x] Reactive answer state per item
- [x] Calculated expressions (FHIRPath)
- [x] enableWhen — structured conditions
- [x] enableWhen — FHIRPath expressions (`enableWhenExpression`)
- [x] Answer option toggles (restriction via `answerOptionsToggleExpression`)
- [x] Dirty/touched tracking
- [x] FHIR QuestionnaireResponse serialization
- [x] Hydration from existing QuestionnaireResponse
- [x] Repeating groups — append, remove, reorder instances
- [x] Filter disabled items from serialized output — `toFhir({ excludeDisabled: true })`
- [x] Submit flow — reactive `status`, `submit()` method
- [x] Read-only enforcement — `setAnswer`/`addAnswer` no-op on `readOnly` items
- [x] Local validation — `valid`/`errors` with required-field and answerConstraint checks
- [x] Questionnaire metadata on ResponseItem — `disabledDisplay`, `required`, `readOnly`, `repeats`, `answerConstraint`
- [x] Derived visibility — `visible`, `visibleItems`, `hasVisibleItems`, `enabledAnswerOptions`
- [x] Extension preservation on answerOption values
- [x] Arbitrary item IDs — external IDs preserved, new instances get UUIDs
- [x] R4/R5 bidirectional transforms (answerConstraint round-trip documented as lossy for `optionsOrType`)
- [x] React binding layer — context, per-item hooks, `useSignalValue` primitive
- [x] Undo/redo history — see [docs/undo-redo.md](docs/undo-redo.md)

### Gaps to close

#### Input binding
- [ ] Generate a stable path usable as `name` attribute for `<input>` elements

#### Async operations
- [ ] Validation via FHIR `$validate`
  - Trigger: `touch` or `change`
  - Input: QuestionnaireResponse
  - Response: OperationOutcome
- [ ] Re-population via FHIR `$populate`
  - Trigger: `add-group-item` or `add-answer` (when nested items)
  - Response: QuestionnaireResponse

#### Provenance
- [ ] Provenance tracking for QuestionnaireResponse.item

#### Reference hydration
- [ ] References should resolve without caller caring whether target sits contained or in the same bundle
  - `provenance.target[0].resolveSync()` — finds resource locally, throws when fetch needed
  - `provenance.target[0].resolveElementSync()` — finds element locally, fails when fetch needed or no `targetElement` extension

#### Serialization
- [ ] Configurable FHIR R4 serialization
  - [ ] Encode subject as a single element
- [ ] Configurable FHIR R5 serialization
  - [ ] Encode subject as an array
- [ ] Reference notation
  - [ ] `#` when serializing to QR with contained provenance
  - [ ] `urn:uuid:xxx` when serializing to a transaction bundle

#### Response management
- [ ] `setResponse()` with merge strategy
- [ ] `clear()`
- [ ] `onResponseChange` callback
