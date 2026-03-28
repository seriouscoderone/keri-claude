# Feature Request: Allow documentation fields on protocol entries in protocols.yaml schema

## Summary

The protocols.yaml schema needs to allow `failure_paths`, `invariants`, `notes`, and `sub_steps` on protocol and step entries.

## Problem

7 schema warnings fire for fields that carry essential protocol documentation:

- `failure_paths` on protocol — what happens when each step fails
- `invariants` on protocol — guarantees that hold across the entire sequence
- `notes` on steps — implementation guidance and conditional logic
- `sub_steps` on steps — conditional sub-operations within a step (e.g., selective disclosure AND blinding as parallel sub-operations of "produce disclosed variant")

These fields are critical for AI implementability — a protocol without failure paths and sub-step logic is just a happy path.

## Proposed Schema Changes

- [ ] `protocols[].failure_paths` — optional array of {step, failure, handling}
- [ ] `protocols[].invariants` — optional array of strings
- [ ] `protocols[].steps[].notes` — optional string
- [ ] `protocols[].steps[].sub_steps` — optional array of step objects (recursive)

## Acceptance Criteria

- [ ] All 4 fields added to protocols.yaml schema
- [ ] 7 schema warnings resolved
