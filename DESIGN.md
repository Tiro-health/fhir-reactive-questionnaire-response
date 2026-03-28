# Form State Manager — Design Note

> Consolidation of the [Notion backlog entry](https://www.notion.so/311bd303e1d8804f9498d55a023b2e22) and the Obsidian gap analysis (2026-02-23).

## Problem

We are hitting the limits of third-party form libraries:

1. **Data format mismatch** — Form libraries work with their own data format, requiring constant conversion to/from FHIR. This makes advanced FHIR features hard to support.
2. **SDC complexity** — FHIR Questionnaire and the SDC IG involve specific logic (enableWhen cascading, calculated expressions, repeating groups) that off-the-shelf form libraries don't handle.
3. **Framework coupling** — Most form libraries are tied to a specific UI framework, conflicting with our technology-agnostic SDK approach.

## Approach

Big-bang replacement. The signals prototype must reach full feature parity with the current report-renderer before swapping. No incremental migration path.

## Feature Matrix

### Covered by the signals prototype

- [x] Reactive answer state per item
- [x] Calculated expressions (FHIRPath)
- [x] enableWhen — structured conditions
- [x] enableWhen — FHIRPath expressions (`enableExpression`)
- [x] Answer option toggles (restriction)
- [x] Dirty/touched tracking
- [x] FHIR QuestionnaireResponse serialization
- [x] Hydration from existing QuestionnaireResponse

### Gaps to close

#### Repeating groups
- [ ] Append / remove group instance
- [ ] Reorder group instances

#### Input binding
- [ ] Generate a stable path usable as `name` attribute for `<input>` elements

#### Enabled-state logic
- [ ] Cascade of enabled state through nested items
- [ ] Filter disabled items from serialized output
- [ ] Check empty questions after disable

#### Undo / redo
- [ ] Undo / redo history — see [docs/undo-redo.md](docs/undo-redo.md)

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

#### UX state
- [ ] Submit flow and status transitions
- [ ] Read-only items
