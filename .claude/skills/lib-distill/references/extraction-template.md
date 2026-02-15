# Extraction Template — Library Distillation

Use this template when extracting structured data from source code chunks during Phase 2 of lib-distill.

Write one section per category. Skip a category if the chunk has no relevant content. Use tables, not prose.

---

## Category 1: Class & Type Signatures

Captures: public classes, structs, traits/interfaces, constructors, method signatures, inheritance.

| Name | Kind | Parent/Implements | Constructor Params | Key Methods | Source |
|------|------|-------------------|-------------------|-------------|--------|
| `ClassName` | class/struct/trait/interface | `ParentClass` | `param: Type, ...` | `.method(params) -> Return` | `file.py:42` |

**Rules:**
- One row per public class, struct, trait, or interface.
- For methods, list only public/exported ones. Use compact signature: `.name(params) -> Return`.
- If a class has >10 public methods, list the 10 most important and note `+N more`.
- Include generic/type parameters: `MyClass<T: Bound>`.
- For Python, include `@property` and `@classmethod` markers.
- Mark abstract/virtual methods with `(abstract)`.
- Note `[DEP: <module>]` if a type depends on another module's types.

---

## Category 2: Exports & Constants

Captures: module exports, enums, constant tables, code point registries, codex tables (`*Dex`).

| Name | Kind | Values/Variants | Source |
|------|------|-----------------|--------|
| `ExportName` | enum/const/codex/type-alias | `Variant1, Variant2, ...` or `= value` | `file.py:10` |

**Rules:**
- One row per exported constant, enum, type alias, or codex table.
- For enums with >15 variants, list the first 10 and note `+N more`.
- For codex/`*Dex` tables, include the code point values: `Variant = "A"`.
- Record re-exports: note the original source module.
- For `__all__` lists, record every entry.
- Group related constants together (e.g., all digest codes, all signature codes).

---

## Category 3: Initialization & Lifecycle

Captures: creation patterns, required setup order, teardown, thread/async safety, resource management.

| Component | Init Steps | Required Order | Cleanup | Thread Safety |
|-----------|-----------|----------------|---------|---------------|
| `ClassName` | 1. Create with params 2. Call `.setup()` | Must init X before Y | `.close()` / context manager | Thread-safe / Not safe |

**Rules:**
- One row per component that has non-trivial initialization.
- Note factory methods and builder patterns.
- Note async init requirements (`await .connect()`, etc.).
- Note resource acquisition: files, sockets, database connections.
- Note whether the component implements context manager / `Drop` / `Disposable`.
- Flag required ordering: "must create A before B" as `[ORDER: A → B]`.

---

## Category 4: Usage Patterns

Captures: multi-step workflows, happy paths, integration between classes, common calling sequences.

For each pattern:

```
### Pattern: <descriptive-name>

Purpose: <one line>
Components: <list of classes/functions involved>

Steps:
1. <action> — `code_snippet`
2. <action> — `code_snippet`
...

Result: <what the caller gets>
```

**Rules:**
- Extract patterns from: example code, doc comments, test files (if referenced), obvious calling conventions.
- Keep code snippets to 1-3 lines each. Show only the essential call, not setup boilerplate.
- Note alternative paths: "For async: use `await .method()` instead".
- Note preconditions: "Requires initialized `Keeper`".
- Mark integration points: `[INTEGRATES: <other-module>]`.
- Maximum 8 patterns per chunk. Prioritize by: API surface exposure > frequency in codebase > complexity.

---

## Category 5: Error Handling

Captures: custom error types, throw/raise conditions, result types, recoverability.

| Error Type | Raised By | Condition | Recoverable? | Recovery Action |
|------------|-----------|-----------|-------------|-----------------|
| `ErrorName` | `Class.method()` | When X happens | Yes/No | Retry / Fallback / Abort |

**Rules:**
- One row per distinct error type or error condition.
- For Result/Option types, note the error variant and when it occurs.
- For languages with exception hierarchies, note inheritance.
- Note which errors are expected (validation) vs unexpected (bugs).
- Note error codes or error message patterns if they're part of the API.
- Group related errors: "all validation errors", "all network errors".

---

## Category 6: Configuration & Defaults

Captures: config objects, default values, environment variables, feature flags, tuning parameters.

| Config | Type | Default | Env Var | Description |
|--------|------|---------|---------|-------------|
| `param_name` | `Type` | `default_value` | `ENV_VAR` | What it controls |

**Rules:**
- One row per configurable parameter.
- Note whether config is set at init time, runtime, or compile time.
- Note config file formats if applicable (TOML, JSON, YAML).
- Note validation constraints: "must be > 0", "one of: a, b, c".
- Note feature flags and their effects on behavior.
- Group: connection params, security params, performance tuning, debug flags.

---

## General Extraction Rules

1. **Tables over prose.** If it can be a table, make it a table.
2. **One fact per row.** Don't combine multiple items in a cell.
3. **Verbatim names.** Keep all identifiers exactly as they appear in source.
4. **Source locations.** Every row gets a `Source` column: `filename:line`.
5. **Cross-references.** Note dependencies on other modules: `[DEP: <module>]`.
6. **Ambiguity flags.** Mark unclear behavior: `[UNCLEAR: what's ambiguous]`.
7. **Skip internals.** Ignore private methods, test utilities, generated code.
8. **Preserve CESR conventions.** For KERI libraries, keep `qb64`, `qb2`, `Dex`, `-er`, `-ing` naming exactly.
