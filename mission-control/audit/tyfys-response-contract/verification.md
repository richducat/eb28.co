# TYFYS case response contract verification

Date: 2026-10-02. Baseline: a6528d52d4714e12cbc98b064266a303e16e0aee.
Changes made in isolated branch `fix/tyfys-response-contract`.

## Consumer contract

Desktop `ui/app.js` TYFYS board consumes initials, owner, stage, createdAt, app,
computed days and flag. Native `ios/MissionControl/Sources/Models.swift` Tyfys.Case
requires a string id and optionally decodes initials, stage, owner, days and flag;
`OtherViews.swift` renders these operational fields.

Every emitted case now contains exactly:

- id, initials, stage, owner, createdAt, updatedAt: strings. Missing or non-string
  input becomes an empty string; objects and arrays are never stringified.
- app: string, boolean or finite number, preserving desktop scalar truthiness.
  Missing, null, non-finite or structured input becomes false.
- days and flag: computed from the projected updatedAt and existing lane thresholds.
  Invalid dates retain the previous NaN-to-null JSON behavior for days.

Projection occurs before lane selection and KPI/owner aggregation. Source `test`
is still used to exclude test cases before projection. Unknown fields are dropped.
Valid operational strings and dates are preserved without rewriting.

## Reproduction and verification

All fixtures were synthetic; no real pipeline snapshot or CRM record was read.
Tests run with the existing `test/setup.mjs`, which isolates MC_HOME in a temporary
folder. The HTTP test sets MC_TYFYS_SNAPSHOT to its own synthetic temporary file,
uses an EventEmitter instead of the live orchestrator, starts the actual HTTP server
on an ephemeral loopback port, and requests GET /api/tyfys.

On the baseline source, all four new regression tests failed. The baseline exposed
the synthetic private marker in both summarize output and the HTTP response,
forwarded nested id values, and retained invalid display-field types.

On the fixed source, the command below passed all 14 tests (4 new regression tests,
5 existing business tests, 5 existing server tests):

```sh
node --import ./test/setup.mjs --test test/tyfys.test.mjs test/business.test.mjs test/server.test.mjs
```

New regression assertions cover synthetic full name, email, phone, identity number,
medical diagnoses/documents and future fields; object/array values in every allowed
input case field; owner aggregates; non-coercion and finite scalar policy; actual
HTTP serialization; exact case keys; valid operational values; descending age order;
flags; test exclusion; all KPI values and owner counts; source non-mutation.
`git diff --check` passed.

## Scope limits

This is a case-field schema boundary, not a claim that the snapshot or the entire
API response is free of personal data. Permitted strings (including initials, id,
owner and app) are not content-redacted or checked for correct upstream semantics.
Top-level fetchedAt/source and stageCounts handling remain unchanged. This repair
neither audits stored CRM data nor adds whole-snapshot validation, authentication,
UI changes, native builds or endpoint access-policy changes. No push, deployment,
release or account configuration was performed.
