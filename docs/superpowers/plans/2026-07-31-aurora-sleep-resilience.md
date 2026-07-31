# Aurora Sleep Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the KeriChat web UI, the local stdio MCP server, and the hosted `/mcp` endpoint all survive an Aurora Serverless v2 resume, and trigger that resume ahead of the first query so the wait is usually invisible.

**Architecture:** One tested predicate module recognises a resuming cluster; the chat handler retries the single Aurora-touching call behind it while emitting SSE `status` heartbeats (which keep CloudFront's 60s idle timer alive and drive an honest progress message); a new `/api/warm` branch on the same Lambda triggers a resume from page load, first keystroke, and MCP startup. All downstream clients key off a new `DATABASE_RESUMING` error code rather than parsing AWS strings.

**Tech Stack:** TypeScript, AWS CDK 2.238, Lambda Function URL (`RESPONSE_STREAM`), Bedrock Agent Runtime, React 18 + Vite, `@modelcontextprotocol/sdk`, vitest, esbuild.

**Spec:** `docs/superpowers/specs/2026-07-31-aurora-sleep-resilience-design.md`

## Global Constraints

- **Wake budget is 90s**, fixed **3s** retry interval. Never exponential back-off: a resume is a binary state flip and back-off oversleeps past readiness.
- **Discriminate on message wording, never on `err.name === 'ValidationException'`.** Bedrock rewraps the RDS Data API error in `ValidationException`, which also covers bad model ARNs, unknown knowledge-base ids and malformed parameters. Matching that name would retry a config typo for the full 90s.
- `err.name === 'DatabaseResumingException'` **is** safe to match, as a second net.
- **Warming must never surface an error or block sending.** It is an optimisation; every failure path is swallowed.
- **The SSE contract is additive only.** Existing consumers dispatch on `event.type` in a `switch` with no `default`, so unknown `status` events are ignored. Never rename or change the meaning of `chunk`, `citations`, `done`, or `error`.
- **Do not raise `serverlessV2MinCapacity` above 0**, and do not add scheduled keepalives or provisioned capacity. Scale-to-zero is the motivating cost decision.
- Region is **us-east-1**; all AWS CLI calls need `AWS_PROFILE=personal`.
- Aurora cluster id: `kerichat-clustereb0386a7-oxx495f7jnz6`. Chat Lambda log group: `/aws/lambda/KeriChat-ChatHandler6667856F-aVicQUK0BbUI`.
- Measured baseline to beat: **fails in ~4s** against a paused cluster; a resume completes in **25s**.

## Testing Reality — read before starting

Only Task 1 gets automated tests, and that is deliberate per the spec's "out of scope" section.

- `infrastructure/lambda/shared/aurora-wake.ts` is pure logic, so it gets a real vitest suite. **This is where the retry correctness is proven.**
- The chat handler cannot be meaningfully unit-tested: `awslambda.streamifyResponse` is a runtime-injected global. **Do not try to mock it.** Its wiring is verified end-to-end against a genuinely paused cluster.
- `infrastructure/frontend/` and `mcp-servers/keri-chat/` have no test runner and the spec explicitly declines to add one. Those tasks carry exact manual verification commands with expected output instead.

When a task says "verify manually", the listed command and expected output **are** the test. Do not skip them, and do not substitute a unit test that mocks the thing under test.

## File Structure

**Create:**
| File | Responsibility |
|---|---|
| `infrastructure/lambda/shared/aurora-wake.ts` | Recognise a resuming cluster; retry with a deadline. The only place that knows AWS error wording. |
| `infrastructure/lambda/shared/aurora-wake.test.ts` | vitest suite, including the load-bearing negative cases. |
| `infrastructure/vitest.config.ts` | Points vitest at `lambda/**`, which `tsconfig.json` excludes. |

**Modify:**
| File | Change |
|---|---|
| `infrastructure/package.json` | vitest devDep + `test` script |
| `infrastructure/tsconfig.json` | exclude `vitest.config.ts` |
| `infrastructure/lambda/chat-handler/index.ts` | `/api/warm` branch, retry wrap, `status` events, `DATABASE_RESUMING` |
| `infrastructure/lib/stacks/keri-chat-stack.ts` | `serverlessV2AutoPauseDuration` |
| `infrastructure/frontend/src/api/chat.ts` | `warm()`, `warmIfStale()`, `onStatus`, status event type |
| `infrastructure/frontend/src/hooks/useChat.ts` | warm on mount, `wakeStatus`, one auto-resend |
| `infrastructure/frontend/src/App.tsx` | pass `wakeStatus` through |
| `infrastructure/frontend/src/components/ChatWindow.tsx` | warm on first keystroke, render `wakeStatus` |
| `infrastructure/lambda/mcp-handler/index.ts` | abort 85s, soft failure, consume `status` |
| `mcp-servers/keri-chat/src/index.ts` | warm at startup, abort 150s, soft failure, typed error, consume `status` |
| `mcp-servers/keri-chat/package.json` | declare `zod`, add `esbuild`, bundling build script |
| `.gitignore` | un-ignore the bundled `dist/` |
| `.claude-plugin/plugin.json` | declare `mcpServers` with `${CLAUDE_PLUGIN_ROOT}` |
| `.claude/settings.json` | **delete** — its only content was the superseded wiring |
| `CLAUDE.md` | document `mcp-servers/` and the tracked build artifact |
| `skills/chat/SKILL.md` | document `DATABASE_RESUMING` and the sleep behaviour |

---

### Task 1: The wake predicate and retry loop

The whole change rests on this module telling a resuming cluster apart from a misconfiguration. Tests first, and the negative cases matter more than the positive ones.

**Files:**
- Create: `infrastructure/lambda/shared/aurora-wake.ts`
- Create: `infrastructure/lambda/shared/aurora-wake.test.ts`
- Create: `infrastructure/vitest.config.ts`
- Modify: `infrastructure/package.json`
- Modify: `infrastructure/tsconfig.json`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `isAuroraWakeError(err: unknown): boolean`
  - `retryWhileWaking<T>(op: () => Promise<T>, opts: { timeoutMs: number; onWaking?: (elapsedMs: number, attempt: number) => void }): Promise<T>`
  - `class AuroraWakeTimeout extends Error` with `readonly attempts: number` and `readonly elapsedMs: number`, and `name === 'AuroraWakeTimeout'`
  - `const WAKE_RETRY_INTERVAL_MS = 3_000`

- [ ] **Step 1: Add vitest to the infrastructure package**

```bash
cd infrastructure
npm install --save-dev vitest@^2.1.0
```

Then add the `test` script to `infrastructure/package.json`. The `scripts` block currently reads `{"build": "tsc", "watch": "tsc -w", ...}` — add one entry:

```json
"test": "vitest run",
```

- [ ] **Step 2: Create the vitest config**

`infrastructure/tsconfig.json` excludes `lambda`, so vitest needs to be pointed at it explicitly.

Create `infrastructure/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['lambda/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Keep the config out of the CDK build**

`infrastructure/tsconfig.json` has `rootDir: "."` and would compile `vitest.config.ts` into `dist/`. Add it to the existing `exclude` array, which currently reads `["node_modules", "dist", "frontend", "lambda"]`:

```json
  "exclude": [
    "node_modules",
    "dist",
    "frontend",
    "lambda",
    "vitest.config.ts"
  ]
```

- [ ] **Step 4: Write the failing tests**

Create `infrastructure/lambda/shared/aurora-wake.test.ts`. The `productionWakeError` message is copied verbatim from CloudWatch on 2026-07-31.

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isAuroraWakeError,
  retryWhileWaking,
  AuroraWakeTimeout,
} from './aurora-wake';

/** Build an Error with a specific `name`, as the AWS SDK produces. */
function awsError(name: string, message: string): Error {
  const err = new Error(message);
  err.name = name;
  return err;
}

// Verbatim from CloudWatch, chat handler invocation dcbf53b1, 2026-07-31.
const productionWakeError = awsError(
  'ValidationException',
  'The vector database encountered an error while processing the request: ' +
    'The Aurora DB instance db-7RXOGRKA37S5FWCZVG2JMGFO4I is resuming after ' +
    'being auto-paused. Please wait a few seconds and try again. ' +
    '(Service: RdsData, Status Code: 400, Request ID: ' +
    '5575c2c5-1ecd-4708-87a1-ee02e23af7c2) (SDK Attempt Count: 1)',
);

beforeEach(() => {
  // retryWhileWaking emits structured JSON logs; keep test output readable.
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('isAuroraWakeError', () => {
  it('recognises the verbatim production error', () => {
    expect(isAuroraWakeError(productionWakeError)).toBe(true);
  });

  it.each([
    'The Aurora DB instance db-XYZ is resuming after being auto-paused.',
    'The DB cluster is paused. Please wait and try again.',
    'The cluster is being resumed. Retry shortly.',
    'Communications link failure during query',
    'The service is temporarily unavailable, retry later',
  ])('recognises wake wording: %s', (message) => {
    expect(isAuroraWakeError(awsError('ValidationException', message))).toBe(true);
  });

  it('recognises DatabaseResumingException by name, whatever the message', () => {
    expect(
      isAuroraWakeError(awsError('DatabaseResumingException', 'anything at all')),
    ).toBe(true);
  });

  // These two are the load-bearing assertions. If either flips, a configuration
  // typo becomes a silent 90-second hang instead of an immediate failure.
  it('does NOT match an unknown knowledge-base id', () => {
    expect(
      isAuroraWakeError(
        awsError(
          'ValidationException',
          'The knowledge base ABCD1234EF could not be found. ' +
            'Check the knowledge base id and try your request again.',
        ),
      ),
    ).toBe(false);
  });

  it('does NOT match an invalid model identifier', () => {
    expect(
      isAuroraWakeError(
        awsError(
          'ValidationException',
          'The provided model identifier is invalid.',
        ),
      ),
    ).toBe(false);
  });

  it.each(['AccessDeniedException', 'ThrottlingException', 'ResourceNotFoundException'])(
    'does not match unrelated exception %s',
    (name) => {
      expect(isAuroraWakeError(awsError(name, 'some unrelated failure'))).toBe(false);
    },
  );

  it.each([['a string', 'boom'], ['null', null], ['undefined', undefined]])(
    'returns false for non-Error value: %s',
    (_label, value) => {
      expect(isAuroraWakeError(value)).toBe(false);
    },
  );
});

describe('retryWhileWaking', () => {
  it('returns immediately on success, without sleeping or reporting', async () => {
    const op = vi.fn().mockResolvedValue('answer');
    const onWaking = vi.fn();

    const result = await retryWhileWaking(op, { timeoutMs: 90_000, onWaking });

    expect(result).toBe('answer');
    expect(op).toHaveBeenCalledTimes(1);
    expect(onWaking).not.toHaveBeenCalled();
  });

  it('retries past wake errors and reports each one', async () => {
    vi.useFakeTimers();
    const op = vi
      .fn()
      .mockRejectedValueOnce(productionWakeError)
      .mockRejectedValueOnce(productionWakeError)
      .mockResolvedValue('answer');
    const onWaking = vi.fn();

    const pending = retryWhileWaking(op, { timeoutMs: 90_000, onWaking });
    await vi.advanceTimersByTimeAsync(10_000);

    expect(await pending).toBe('answer');
    expect(op).toHaveBeenCalledTimes(3);
    expect(onWaking).toHaveBeenCalledTimes(2);
    // Reports (elapsedMs, attempt) — attempt is 1-based.
    expect(onWaking.mock.calls[0][1]).toBe(1);
    expect(onWaking.mock.calls[1][1]).toBe(2);
  });

  it('rethrows a non-wake error immediately, attempting the operation once', async () => {
    const configError = awsError(
      'ValidationException',
      'The provided model identifier is invalid.',
    );
    const op = vi.fn().mockRejectedValue(configError);

    await expect(
      retryWhileWaking(op, { timeoutMs: 90_000 }),
    ).rejects.toThrow('The provided model identifier is invalid.');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('throws AuroraWakeTimeout past the deadline, carrying attempts and elapsed', async () => {
    vi.useFakeTimers();
    const op = vi.fn().mockRejectedValue(productionWakeError);

    const settled = retryWhileWaking(op, { timeoutMs: 9_000 }).catch((e) => e);
    await vi.advanceTimersByTimeAsync(30_000);
    const err = await settled;

    expect(err).toBeInstanceOf(AuroraWakeTimeout);
    expect(err.name).toBe('AuroraWakeTimeout');
    expect(err.attempts).toBeGreaterThan(1);
    expect(err.elapsedMs).toBeGreaterThanOrEqual(9_000);
  });

  it('does not report a wake it is about to give up on', async () => {
    vi.useFakeTimers();
    const op = vi.fn().mockRejectedValue(productionWakeError);
    const onWaking = vi.fn();

    const settled = retryWhileWaking(op, { timeoutMs: 0, onWaking }).catch((e) => e);
    await vi.advanceTimersByTimeAsync(1_000);
    await settled;

    expect(onWaking).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Run the tests to verify they fail**

```bash
cd infrastructure && npm test
```

Expected: FAIL — `Cannot find module './aurora-wake'` (the module does not exist yet).

- [ ] **Step 6: Implement the module**

Create `infrastructure/lambda/shared/aurora-wake.ts`:

```ts
/**
 * Recognising and riding out an Aurora Serverless v2 resume.
 *
 * The knowledge base cluster runs at serverlessV2MinCapacity: 0 and auto-pauses
 * after 300s idle. Resuming takes ~25s (measured 2026-07-31) and the AWS SDK
 * will not retry it: Bedrock rewraps the RDS Data API failure as
 * ValidationException with $fault: "client" and no retryable trait, so the
 * SDK's own retry layer declines it (attempts: 1). Nothing configurable on the
 * client changes that classification, so the retry has to live here.
 */

/**
 * Message fragments that mean "the cluster is waking".
 *
 * Deliberately matched on wording rather than on err.name. The name here is
 * ValidationException, which Bedrock also uses for bad model ARNs, unknown
 * knowledge-base ids, and malformed parameters — retrying those for the full
 * budget would turn a config typo into a silent 90-second hang. None of these
 * fragments can appear in such an error, because none of them mention resuming.
 */
const WAKE_MESSAGES = [
  'is resuming after being auto-paused', // verbatim, measured 2026-07-31
  'DB cluster is paused',
  'cluster is being resumed',
  'Communications link failure',
  'temporarily unavailable',
];

/** Exception classes that mean "transient wake" whatever the message. */
const WAKE_NAMES = ['DatabaseResumingException'];

export function isAuroraWakeError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  // Second net: if Bedrock ever stops rewrapping and passes the class through.
  if (WAKE_NAMES.includes(err.name)) return true;
  return WAKE_MESSAGES.some((fragment) => err.message.includes(fragment));
}

export class AuroraWakeTimeout extends Error {
  readonly attempts: number;
  readonly elapsedMs: number;

  constructor(attempts: number, elapsedMs: number) {
    super(
      `Knowledge base did not finish resuming within ${elapsedMs}ms ` +
        `(${attempts} attempts)`,
    );
    this.name = 'AuroraWakeTimeout';
    this.attempts = attempts;
    this.elapsedMs = elapsedMs;
  }
}

/**
 * Fixed interval, not exponential back-off: a resume is a binary state flip
 * (the cluster rejects until it is ready), so back-off only risks oversleeping
 * past the moment it becomes available.
 */
export const WAKE_RETRY_INTERVAL_MS = 3_000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function retryWhileWaking<T>(
  op: () => Promise<T>,
  opts: {
    timeoutMs: number;
    onWaking?: (elapsedMs: number, attempt: number) => void;
  },
): Promise<T> {
  const start = Date.now();
  const deadline = start + opts.timeoutMs;
  let attempt = 0;

  for (;;) {
    try {
      const result = await op();
      if (attempt > 0) {
        console.log(
          JSON.stringify({
            level: 'INFO',
            event: 'aurora_wake_complete',
            attempts: attempt,
            resume_latency_ms: Date.now() - start,
          }),
        );
      }
      return result;
    } catch (err) {
      if (!isAuroraWakeError(err)) throw err;

      attempt += 1;
      const elapsedMs = Date.now() - start;

      console.log(
        JSON.stringify({
          level: 'WARN',
          event: 'aurora_wake_detected',
          attempt,
          elapsed_ms: elapsedMs,
          error_snippet: (err as Error).message.slice(0, 120),
        }),
      );

      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new AuroraWakeTimeout(attempt, elapsedMs);

      // Only report a wake we intend to keep waiting for.
      opts.onWaking?.(elapsedMs, attempt);
      await sleep(Math.min(WAKE_RETRY_INTERVAL_MS, remaining));
    }
  }
}
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
cd infrastructure && npm test
```

Expected: PASS — all tests green. If the two "does NOT match" cases fail, the predicate is matching on name somewhere; fix that before continuing, because everything downstream trusts it.

- [ ] **Step 8: Confirm the CDK build still works**

```bash
cd infrastructure && npm run build
```

Expected: exits 0 with no output. (`lambda/` and `vitest.config.ts` are both excluded from `tsc`.)

- [ ] **Step 9: Commit**

```bash
git add infrastructure/lambda/shared/aurora-wake.ts \
        infrastructure/lambda/shared/aurora-wake.test.ts \
        infrastructure/vitest.config.ts \
        infrastructure/package.json \
        infrastructure/package-lock.json \
        infrastructure/tsconfig.json
git commit -m "feat(chat): recognise and ride out an Aurora resume

Bedrock rewraps the RDS Data API resume error as ValidationException with
no retryable trait, so the SDK declines it (attempts: 1). Match on message
wording rather than exception name: ValidationException also covers bad
model ARNs and unknown knowledge-base ids, and retrying those for the full
budget would turn a config typo into a silent hang. Those two negative
cases are the load-bearing tests."
```

---

### Task 2: Retry the retrieval behind SSE heartbeats

**Files:**
- Modify: `infrastructure/lambda/chat-handler/index.ts`

**Interfaces:**
- Consumes: `retryWhileWaking`, `AuroraWakeTimeout` from Task 1.
- Produces: two additions to the SSE wire contract that Tasks 5, 8 and 10 consume:
  - `{"type":"status","state":"waking","elapsedMs":<number>,"detail":"Waking the knowledge base…"}`
  - `{"type":"error","code":"DATABASE_RESUMING","error":"Knowledge base is waking up","detail":"..."}`

- [ ] **Step 0: Give `lambda/` a type-check first**

`infrastructure/tsconfig.json` excludes `lambda/`, and the CDK bundles it with esbuild — which strips types without checking them. Verified empirically: planting `const x: number = "nope";` in a lambda file leaves `npm run build` exiting 0. So **every type error in `lambda/` currently ships to production silently.** Tasks 2, 3 and 10 all add real logic there, so close this before adding more.

Create `infrastructure/lambda/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "types": ["node"]
  },
  "include": ["**/*.ts"]
}
```

`DOM` is in `lib` because the handlers use `fetch`, `Request` and `Headers`. `noEmit` is set because the CDK does the actual bundling — this config exists only to check types.

Add the script to `infrastructure/package.json`:

```json
"typecheck:lambda": "tsc -p lambda/tsconfig.json",
```

Verify it both passes now and actually catches errors:

```bash
cd infrastructure && npm run typecheck:lambda && echo "CLEAN"
printf '\nconst __probe: number = "nope";\n' >> lambda/shared/aurora-wake.ts
npm run typecheck:lambda; echo "exit=$? (expect non-zero)"
git checkout lambda/shared/aurora-wake.ts
npm run typecheck:lambda && echo "CLEAN AGAIN"
```

Expected: `CLEAN`, then a non-zero exit naming `__probe`, then `CLEAN AGAIN`. If the probe does not fail the check, the config is not covering `lambda/` — fix that before continuing.

Run `npm run typecheck:lambda` before each commit in this task and in Tasks 3 and 10.

- [ ] **Step 1: Import the module and declare the budget**

In `infrastructure/lambda/chat-handler/index.ts`, after the existing `import { Writable } from 'stream';` (line 10), add:

```ts
import {
  retryWhileWaking,
  AuroraWakeTimeout,
} from '../shared/aurora-wake';
```

The CDK `NodejsFunction` bundles relative imports with esbuild, so no CDK change is needed for this.

Then below the two client constructions (`const bedrockAgent = ...`, line 13), add:

```ts
/**
 * Aurora resume measured at 25s on 2026-07-31; this is 3.6x that. Safe despite
 * CloudFront's 60s readTimeout on /api/*, because the response is a stream and
 * that 60s is idle time *between bytes* — the status heartbeats below reset it.
 * The Lambda's own timeout is 300s.
 */
const WAKE_BUDGET_MS = 90_000;
```

- [ ] **Step 2: Let retrieveChunks take a result count**

Task 3 needs a cheap single-result variant. Change the signature (line 98) from:

```ts
async function retrieveChunks(query: string): Promise<Chunk[]> {
```

to:

```ts
async function retrieveChunks(
  query: string,
  numberOfResults = 10,
): Promise<Chunk[]> {
```

and inside the `vectorSearchConfiguration` (line 105), replace `numberOfResults: 10,` with:

```ts
          numberOfResults,
```

- [ ] **Step 3: Wrap the retrieval**

Replace the Step 2 retrieval (line 274-275):

```ts
      // Step 2: Retrieve chunks (synchronous)
      const chunks = await retrieveChunks(reformulatedQuery);
```

with:

```ts
      // Step 2: Retrieve chunks — the only step that touches Aurora, so the
      // only one that can meet a paused cluster. Heartbeats keep CloudFront's
      // idle timer alive and drive the client's progress message.
      const chunks = await retryWhileWaking(
        () => retrieveChunks(reformulatedQuery),
        {
          timeoutMs: WAKE_BUDGET_MS,
          onWaking: (elapsedMs) =>
            writeSSE(httpStream, {
              type: 'status',
              state: 'waking',
              elapsedMs,
              detail: 'Waking the knowledge base…',
            }),
        },
      );
```

- [ ] **Step 4: Give the exhausted budget its own error code**

In `writeErrorSSE`, insert this as the **first** branch, immediately after the `errName` declaration (line 173) and before the existing `use case details` check. Order matters: it must win before the generic fallback.

```ts
  if (err instanceof AuroraWakeTimeout || errName === 'AuroraWakeTimeout') {
    writeSSE(stream, {
      type: 'error',
      error: 'Knowledge base is waking up',
      code: 'DATABASE_RESUMING',
      detail:
        'The database sleeps when idle to save cost. It should be ready in ' +
        'about 30 seconds — please try again.',
    });
    return;
  }
```

- [ ] **Step 5: Type-check and synthesise**

```bash
cd infrastructure && npm run typecheck:lambda && npx cdk synth KeriChat > /dev/null && echo "OK"
```

Expected: `OK`. Note that `cdk synth` alone would **not** catch a type error — that is why the type-check runs first. A synth failure almost always means the `../shared/aurora-wake` import path is wrong; it resolves from `lambda/chat-handler/` to `lambda/shared/`.

- [ ] **Step 6: Commit**

```bash
git add infrastructure/lambda/tsconfig.json \
        infrastructure/package.json \
        infrastructure/lambda/chat-handler/index.ts
git commit -m "feat(chat): retry a resuming knowledge base behind SSE heartbeats

retrieveChunks is the only step that touches Aurora. Wrap it in a 90s wake
budget and emit a status event per attempt: those bytes reset CloudFront's
60s idle timer, so the wait is not capped by it, and the same events give
the client something honest to show. An exhausted budget now reports
DATABASE_RESUMING rather than a generic INTERNAL_ERROR."
```

---

### Task 3: The `/api/warm` branch

Verified already: `POST https://chat.keri.host/api/warm` reaches this Lambda with the path intact (it returned the handler's own `BAD_REQUEST`). So this needs **no CDK change and no new IAM** — the function already holds `bedrock:Retrieve`.

**Files:**
- Modify: `infrastructure/lambda/chat-handler/index.ts`

**Interfaces:**
- Consumes: `retrieveChunks(query, numberOfResults)` and `isAuroraWakeError` .
- Produces: `POST /api/warm` → `200` with JSON body `{"status":"ready"|"warming"|"unavailable"}`. Consumed by Tasks 5 and 8.

- [ ] **Step 1: Import the predicate**

Extend the Task 2 import in `infrastructure/lambda/chat-handler/index.ts` to add `isAuroraWakeError`:

```ts
import {
  retryWhileWaking,
  AuroraWakeTimeout,
  isAuroraWakeError,
} from '../shared/aurora-wake';
```

- [ ] **Step 2: Branch before the SSE stream is created**

The warm response is JSON, not SSE, so this must come **before** the existing `awslambda.HttpResponseStream.from(...)` call that sets `Content-Type: text/event-stream` (line 243).

Replace the opening of the handler body:

```ts
  async (event: any, responseStream: Writable, _context: any) => {
    const httpStream = awslambda.HttpResponseStream.from(responseStream, {
```

with:

```ts
  async (event: any, responseStream: Writable, _context: any) => {
    const path: string =
      event.rawPath ?? event.requestContext?.http?.path ?? '';

    // Warm path: trigger an Aurora resume and return at once. One Retrieve is
    // enough to start the wake; there is deliberately no retry loop here,
    // because the caller is not waiting for an answer.
    if (path.endsWith('/warm')) {
      const warmStream = awslambda.HttpResponseStream.from(responseStream, {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });

      let status = 'ready';
      try {
        // numberOfResults: 1 — this is a connection probe, not a query.
        await retrieveChunks('warm', 1);
      } catch (err) {
        status = isAuroraWakeError(err) ? 'warming' : 'unavailable';
        console.log(
          JSON.stringify({
            level: 'INFO',
            event: 'warm_probe',
            status,
            error_snippet:
              err instanceof Error ? err.message.slice(0, 120) : String(err),
          }),
        );
      }

      warmStream.write(JSON.stringify({ status }));
      warmStream.end();
      return;
    }

    const httpStream = awslambda.HttpResponseStream.from(responseStream, {
```

Note the warm branch **never throws and never returns non-200**: warming is an optimisation, and a client must never be blocked or shown an error by it.

- [ ] **Step 3: Type-check and synthesise**

```bash
cd infrastructure && npm run typecheck:lambda && npx cdk synth KeriChat > /dev/null && echo "OK"
```

Expected: `OK`. The type-check is the load-bearing half — `cdk synth` bundles with esbuild, which strips types without checking them, so synth alone would pass a type error straight through to production.

- [ ] **Step 4: Commit**

```bash
git add infrastructure/lambda/chat-handler/index.ts
git commit -m "feat(chat): add /api/warm to trigger an Aurora resume early

/api/* already reaches this Lambda with the path intact, so this needs no
new infrastructure and no new IAM. One numberOfResults:1 Retrieve is enough
to start the wake; no retry loop, no reformulation, no generation. Never
throws and never returns non-200 — warming is an optimisation and must not
be able to block or alarm a caller."
```

---

### Task 4: Deploy, close the CDK drift, and measure — the gate

This is the checkpoint the rest of the plan depends on. If the measured behaviour does not change here, stop and diagnose rather than continuing to the clients.

**Files:**
- Modify: `infrastructure/lib/stacks/keri-chat-stack.ts`

**Interfaces:**
- Consumes: Tasks 2 and 3 deployed.
- Produces: a live `/api/chat` that answers through a resume, and a live `/api/warm`.

- [ ] **Step 1: Declare the auto-pause duration**

In `infrastructure/lib/stacks/keri-chat-stack.ts`, after `serverlessV2MaxCapacity: 4,` (line 217), add:

```ts
      // 300s is what the cluster is running today, but it lives only in live
      // state — the deployed template never carried it. Declaring it makes the
      // pause behaviour reproducible from code.
      serverlessV2AutoPauseDuration: cdk.Duration.minutes(5),
```

- [ ] **Step 2: Confirm the diff is only what you expect**

```bash
cd infrastructure && AWS_PROFILE=personal AWS_DEFAULT_REGION=us-east-1 \
  CDK_DEFAULT_REGION=us-east-1 npx cdk diff KeriChat 2>&1 | grep -iA4 "MinCapacity\|AutoPause"
```

Expected: `MinCapacity` moving **0.5 → 0** (the committed value that was never deployed — the live `0` came from a manual change) and `SecondsUntilAutoPause` being added as `300`. If you see changes to the cluster's engine version, subnets, or removal policy, **stop** — something unrelated has drifted.

- [ ] **Step 3: Deploy**

```bash
cd infrastructure && ./scripts/deploy.sh --profile personal
```

Expected: `KeriChat` completes with `UPDATE_COMPLETE`.

- [ ] **Step 4: Verify the warm endpoint**

```bash
curl -s -X POST https://chat.keri.host/api/warm \
  -H 'Content-Type: application/json' -d '{}' -w '\nHTTP=%{http_code}\n'
```

Expected: `HTTP=200` and a body of `{"status":"ready"}` (cluster awake) or `{"status":"warming"}` (cluster was paused, resume now triggered). Anything else — especially an SSE `data:` line — means the path branch is not being reached.

- [ ] **Step 5: Wait for a genuine auto-pause**

Do not skip this. A test against an awake cluster is a non-result, not a pass.

```bash
AWS_PROFILE=personal aws cloudwatch get-metric-statistics --region us-east-1 \
  --namespace AWS/RDS --metric-name ServerlessDatabaseCapacity \
  --dimensions Name=DBClusterIdentifier,Value=kerichat-clustereb0386a7-oxx495f7jnz6 \
  --start-time "$(date -u -v-15M +%Y-%m-%dT%H:%M:%S)" \
  --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
  --period 60 --statistics Average \
  --query 'sort_by(Datapoints,&Timestamp)[-1].Average' --output text
```

Repeat until it prints `0.0`. Expect roughly 8-10 minutes after last use: capacity winds down 3.0 → 1.5 → 0 before pausing.

- [ ] **Step 6: Measure the cold request**

```bash
time curl -sN --max-time 180 https://chat.keri.host/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"What is pre-rotation in KERI?","history":[]}' \
  | head -c 600
```

Expected: at least one `data: {"type":"status","state":"waking",...}` line, then `data: {"type":"chunk",...}` lines carrying a real answer, completing in roughly **25-35s**.

Regression baseline: before this change the same command returned `{"type":"error","code":"INTERNAL_ERROR"}` in ~4s.

- [ ] **Step 7: Confirm from the logs that the retry actually fired**

```bash
AWS_PROFILE=personal aws logs filter-log-events --region us-east-1 \
  --log-group-name /aws/lambda/KeriChat-ChatHandler6667856F-aVicQUK0BbUI \
  --start-time $(( ($(date +%s) - 600) * 1000 )) \
  --filter-pattern 'aurora_wake' --query 'events[].message' --output text
```

Expected: `aurora_wake_detected` entries with rising `elapsed_ms`, then one `aurora_wake_complete` carrying `attempts` and `resume_latency_ms`. **If these are absent, the cluster was already awake and Step 6 proved nothing** — return to Step 5.

- [ ] **Step 8: Commit**

```bash
git add infrastructure/lib/stacks/keri-chat-stack.ts
git commit -m "chore(infra): declare Aurora auto-pause duration explicitly

SecondsUntilAutoPause: 300 was live-only; the deployed template never
carried it. This deploy also finally lands the committed MinCapacity 0,
which had never been deployed — the template still said 0.5 while the live
cluster reported 0 from a manual change."
```

---

### Task 5: Frontend API layer

**Files:**
- Modify: `infrastructure/frontend/src/api/chat.ts`

**Interfaces:**
- Consumes: `/api/warm` (Task 3), `status` events and `DATABASE_RESUMING` (Task 2).
- Produces, for Tasks 6 and 7:
  - `warm(): Promise<void>` — never rejects
  - `warmIfStale(): Promise<void>` — never rejects, no-ops within `WARM_TTL_MS`
  - `streamMessage(..., onStatus?: (s: WakeStatus) => void)` — a **sixth, optional** parameter
  - `interface WakeStatus { state: string; elapsedMs: number; detail?: string }`

- [ ] **Step 1: Add the warm helpers**

At the top of `infrastructure/frontend/src/api/chat.ts`, above the existing `export interface NumberedCitation`, add:

```ts
/**
 * The knowledge base runs on Aurora Serverless v2 at min capacity 0 and pauses
 * after 5 minutes idle; resuming takes ~25s. Warming triggers that resume
 * ahead of a real query so the wait is usually invisible.
 *
 * Tied to intent rather than a timer: page load and first keystroke. A
 * periodic keepalive would hold the cluster awake for as long as a tab stayed
 * open, which defeats the cost saving the sleep exists for.
 */
const WARM_TTL_MS = 4 * 60 * 1000;
const WARM_KEY = 'keri-chat:last-warm';

/** Fire-and-forget. Warming is an optimisation and must never surface. */
export async function warm(): Promise<void> {
  try {
    await fetch('/api/warm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
  } catch {
    // Deliberately swallowed.
  }
}

/** Warm unless we already did within WARM_TTL_MS. Never rejects. */
export async function warmIfStale(): Promise<void> {
  try {
    const last = Number(sessionStorage.getItem(WARM_KEY) ?? 0);
    if (Date.now() - last < WARM_TTL_MS) return;
    // Stamp before awaiting, so concurrent callers do not both fire.
    sessionStorage.setItem(WARM_KEY, String(Date.now()));
    await warm();
  } catch {
    // sessionStorage can throw in private-mode browsers; warming is optional.
  }
}
```

- [ ] **Step 2: Add the status event to the wire types**

After the existing `interface SSEDoneEvent` block, add:

```ts
export interface WakeStatus {
  state: string;
  elapsedMs: number;
  detail?: string;
}

interface SSEStatusEvent extends WakeStatus {
  type: 'status';
}
```

Then extend the union, changing:

```ts
type SSEEvent = SSEChunkEvent | SSECitationsEvent | SSEDoneEvent | SSEErrorEvent;
```

to:

```ts
type SSEEvent =
  | SSEChunkEvent
  | SSECitationsEvent
  | SSEDoneEvent
  | SSEErrorEvent
  | SSEStatusEvent;
```

- [ ] **Step 3: Accept and dispatch the status callback**

Add a sixth parameter to `streamMessage`, changing:

```ts
  onCitations: (citations: NumberedCitation[]) => void,
): Promise<void> {
```

to:

```ts
  onCitations: (citations: NumberedCitation[]) => void,
  onStatus?: (status: WakeStatus) => void,
): Promise<void> {
```

Then in the event `switch`, add a case before `case 'error':`:

```ts
        case 'status':
          onStatus?.({
            state: event.state,
            elapsedMs: event.elapsedMs,
            detail: event.detail,
          });
          break;
```

- [ ] **Step 4: Verify the frontend still type-checks and builds**

```bash
cd infrastructure/frontend && npm run build
```

Expected: `tsc` passes and vite writes `dist/`. No errors.

- [ ] **Step 5: Commit**

```bash
git add infrastructure/frontend/src/api/chat.ts
git commit -m "feat(frontend): warm the knowledge base and consume status events

warm()/warmIfStale() never reject and never block — warming is an
optimisation. The 4-minute TTL is stamped before awaiting so two callers
cannot both fire. onStatus is an optional sixth parameter, keeping every
existing call site valid."
```

---

### Task 6: Wake state and a single auto-resend

**Files:**
- Modify: `infrastructure/frontend/src/hooks/useChat.ts`

**Interfaces:**
- Consumes: `warmIfStale`, `WakeStatus`, `streamMessage`'s `onStatus` (Task 5).
- Produces: `useChat()` returns an added `wakeStatus?: string`, consumed by Tasks 7 and the App wiring.

- [ ] **Step 1: Extend the imports and add wake state**

Change the import on line 1-2 to add `useEffect` and the new API surface:

```ts
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  streamMessage,
  warmIfStale,
  ChatApiError,
  NumberedCitation,
  Attachment,
  WakeStatus,
} from '../api/chat';
```

Then inside `useChat`, after the `streamRef` declaration (line 23), add:

```ts
  const [wakeStatus, setWakeStatus] = useState<string>();

  // Trigger a resume as the page opens, so a first question usually lands on
  // an awake cluster. Intentionally not awaited.
  useEffect(() => {
    void warmIfStale();
  }, []);
```

- [ ] **Step 2: Replace the send body with a bounded retry loop**

Replace the whole `try { ... } catch (err) { ... } finally { ... }` block inside `send` (lines 46-104) with:

```ts
      // History reflects the conversation before this exchange.
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const onChunk = (chunk: string) => {
        streamRef.current += chunk;
        const accumulated = streamRef.current;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: accumulated };
          }
          return updated;
        });
      };

      const onCitations = (citations: NumberedCitation[]) => {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, citations };
          }
          return updated;
        });
      };

      const onStatus = (status: WakeStatus) => {
        const seconds = Math.round(status.elapsedMs / 1000);
        setWakeStatus(
          `${status.detail ?? 'Waking the knowledge base…'}${
            seconds > 0 ? ` ${seconds}s` : ''
          }`,
        );
      };

      // Two attempts at most. The outer net covers an exhausted server-side
      // wake budget and a connection dropped before any content arrived; the
      // placeholder assistant message is reused, never re-appended.
      let lastErr: unknown;
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) {
          setWakeStatus('Knowledge base is still waking — retrying…');
          await new Promise((r) => setTimeout(r, 3000));
        }
        try {
          streamRef.current = '';
          await streamMessage(
            text,
            history,
            attachments,
            onChunk,
            onCitations,
            onStatus,
          );
          lastErr = undefined;
          break;
        } catch (err) {
          lastErr = err;
          const isWaking =
            err instanceof ChatApiError && err.code === 'DATABASE_RESUMING';
          const droppedEmpty =
            !(err instanceof ChatApiError) && streamRef.current === '';
          if (!isWaking && !droppedEmpty) break;
        }
      }

      setWakeStatus(undefined);
      setIsLoading(false);

      if (lastErr) {
        // Drop the placeholder if nothing ever streamed into it.
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant' && !last.content) {
            return prev.slice(0, -1);
          }
          return prev;
        });
        if (lastErr instanceof ChatApiError) {
          setError({
            message: lastErr.message,
            code: lastErr.code,
            detail: lastErr.detail,
          });
        } else {
          setError({
            message:
              lastErr instanceof Error
                ? lastErr.message
                : 'An unexpected error occurred',
          });
        }
      }
```

Note there is no longer a `finally`: `setIsLoading(false)` and `setWakeStatus(undefined)` are reached on both paths because the loop swallows its own throws.

- [ ] **Step 3: Clear wake state on reset, and return it**

Change `reset` (line 109) to also clear the wake status:

```ts
  const reset = useCallback(() => {
    setMessages([]);
    setError(undefined);
    setWakeStatus(undefined);
  }, []);
```

And change the return (line 114) to:

```ts
  return { messages, isLoading, error, wakeStatus, send, reset };
```

- [ ] **Step 4: Verify it builds**

```bash
cd infrastructure/frontend && npm run build
```

Expected: passes. A `'attachments' is declared but never read` style error means the `onChunk`/`onCitations` extraction dropped a reference — re-check Step 2.

- [ ] **Step 5: Commit**

```bash
git add infrastructure/frontend/src/hooks/useChat.ts
git commit -m "feat(frontend): show wake progress and auto-resend once

Warms on mount. Renders server status events as progress text instead of a
bare spinner. Retries exactly once — on an exhausted server wake budget, or
a stream that dropped before any content arrived — reusing the placeholder
assistant message rather than appending a second one."
```

---

### Task 7: Warm on typing, and render the wake message

**Files:**
- Modify: `infrastructure/frontend/src/App.tsx`
- Modify: `infrastructure/frontend/src/components/ChatWindow.tsx`

**Interfaces:**
- Consumes: `wakeStatus` from Task 6, `warmIfStale` from Task 5.
- Produces: nothing downstream.

- [ ] **Step 1: Pass wakeStatus through App**

In `infrastructure/frontend/src/App.tsx`, change line 5:

```ts
  const { messages, isLoading, error, send, reset } = useChat();
```

to:

```ts
  const { messages, isLoading, error, wakeStatus, send, reset } = useChat();
```

and the `ChatWindow` element (lines 46-51) to:

```tsx
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          error={error}
          wakeStatus={wakeStatus}
          onSend={send}
        />
```

- [ ] **Step 2: Accept the prop and import the warm helper**

In `infrastructure/frontend/src/components/ChatWindow.tsx`, change the import on line 3:

```ts
import { Attachment } from '../api/chat';
```

to:

```ts
import { Attachment, warmIfStale } from '../api/chat';
```

Then extend `Props` (lines 13-18) with the new field:

```ts
interface Props {
  messages: Message[];
  isLoading: boolean;
  error?: ChatErrorInfo;
  wakeStatus?: string;
  onSend: (text: string, attachments?: Attachment[]) => void;
}
```

and destructure it (lines 24-29):

```ts
export default function ChatWindow({
  messages,
  isLoading,
  error,
  wakeStatus,
  onSend,
}: Props) {
```

- [ ] **Step 3: Warm on the first keystroke into an empty composer**

Add this handler after `handleKeyDown` (line 62):

```ts
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    // First keystroke into an empty composer is the strongest available signal
    // of intent — warm now so the cluster is up by the time they hit send.
    // warmIfStale() no-ops if we warmed within the last 4 minutes.
    if (!input && next) void warmIfStale();
    setInput(next);
  };
```

Then change the textarea's handler (line 225) from:

```tsx
              onChange={(e) => setInput(e.target.value)}
```

to:

```tsx
              onChange={handleInputChange}
```

- [ ] **Step 4: Render the wake message in place of the dots**

Replace the loading-dots block (lines 130-146) with:

```tsx
              {isLoading && (!messages.length || messages[messages.length - 1]?.content === '') && (
                <div className="flex justify-start mb-4">
                  <div className="bg-keri-surface rounded-2xl rounded-bl-sm px-4 py-3">
                    {wakeStatus ? (
                      <p className="text-sm text-keri-text-muted">
                        {wakeStatus}
                        <span className="block text-xs text-keri-text-muted/70 mt-0.5">
                          The database sleeps when idle to keep costs near zero.
                        </span>
                      </p>
                    ) : (
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-keri-text-muted animate-pulse" />
                        <span
                          className="w-2 h-2 rounded-full bg-keri-text-muted animate-pulse"
                          style={{ animationDelay: '0.15s' }}
                        />
                        <span
                          className="w-2 h-2 rounded-full bg-keri-text-muted animate-pulse"
                          style={{ animationDelay: '0.3s' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
```

- [ ] **Step 5: Build and deploy the frontend**

```bash
cd infrastructure/frontend && npm run build
cd .. && ./scripts/deploy.sh --profile personal
```

Expected: build passes, deploy reaches `UPDATE_COMPLETE`.

- [ ] **Step 6: Verify manually in the browser**

Open https://chat.keri.host and check, in order:

1. **Warm on load.** Open devtools Network before loading. Expect one `POST /api/warm` returning `200` with `{"status":"ready"}` or `{"status":"warming"}`.
2. **Warm is throttled.** Reload within four minutes. Expect **no** second `/api/warm` call (the `sessionStorage` TTL suppresses it).
3. **Warm on typing.** Wait past five minutes idle so the cluster pauses, then type one character. Expect a fresh `POST /api/warm`.
4. **The wake message.** Force a cold hit: open a private window (empty `sessionStorage`, so nothing is throttled — but confirm the cluster is at 0 ACU first using the Task 4 Step 5 command), then send a question **immediately**, beating the warm. Expect "Waking the knowledge base… Ns" with the cost explanation beneath it, then a normal answer — not a spinner, and not an error.

- [ ] **Step 7: Commit**

```bash
git add infrastructure/frontend/src/App.tsx \
        infrastructure/frontend/src/components/ChatWindow.tsx
git commit -m "feat(frontend): warm on first keystroke, show the wake message

First keystroke into an empty composer is the strongest intent signal
available, and warmIfStale no-ops inside its 4-minute TTL, so this costs at
most one wake per burst of use. A 25s spinner reads as broken; naming the
reason does not."
```

---

### Task 8: Local MCP server — warm, wait, and fail softly

This is the task that fixes "my Claude thinks it's down". Because the stdio server is a long-lived subprocess, it can warm at startup — so a cold cluster usually never reaches the agent at all.

**Files:**
- Modify: `mcp-servers/keri-chat/src/index.ts`

**Interfaces:**
- Consumes: `/api/warm` (Task 3), `status` events and `DATABASE_RESUMING` (Task 2).
- Produces: nothing downstream.

- [ ] **Step 1: Derive the warm URL and add the stale check**

In `mcp-servers/keri-chat/src/index.ts`, after the `LOG_PATH` declaration (line 13), add:

```ts
const WARM_API_URL = CHAT_API_URL.replace(/\/chat$/, "/warm");

/**
 * The knowledge base runs on Aurora Serverless v2 at min capacity 0 and pauses
 * after 5 minutes idle; resuming takes ~25s. This server is a long-lived
 * subprocess, so unlike the stateless hosted /mcp endpoint it can trigger the
 * resume before the agent asks anything.
 */
const WARM_TTL_MS = 4 * 60 * 1000;
let lastWarmAt = 0;

async function warmIfStale(): Promise<void> {
  if (Date.now() - lastWarmAt < WARM_TTL_MS) return;
  lastWarmAt = Date.now();
  try {
    await fetch(WARM_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Warming is an optimisation; a failure here must never surface.
  }
}
```

- [ ] **Step 2: Add a typed error so the code survives to the caller**

Today the SSE `error` event is rethrown as a bare `Error` with the code stringified into the message, which the tool handler cannot branch on. Add this above `queryKeriChat` (line 60):

```ts
class ChatApiError extends Error {
  readonly code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "ChatApiError";
    this.code = code;
  }
}
```

- [ ] **Step 3: Add the status event type**

After the `SSEDoneEvent` interface, add:

```ts
interface SSEStatusEvent {
  type: "status";
  state: string;
  elapsedMs: number;
  detail?: string;
}
```

and add `| SSEStatusEvent` to the `SSEEvent` union (lines 54-58), so it becomes:

```ts
type SSEEvent =
  | SSEChunkEvent
  | SSECitationsEvent
  | SSEDoneEvent
  | SSEErrorEvent
  | SSEStatusEvent;
```

- [ ] **Step 4: Raise the abort and handle both new events**

Change the abort (line 68) from `AbortSignal.timeout(55_000)` to:

```ts
    // Must exceed the server's 90s wake budget *plus* generation: a worst-case
    // wake followed by ~40s of streaming is ~130s, which a 120s abort would
    // truncate just before the answer completed. Nothing else bounds this hop —
    // /api/chat streams, so CloudFront's 60s is idle-time-between-bytes.
    signal: AbortSignal.timeout(150_000),
```

Then in the event `switch` (lines 124-137), add a `status` case and make the `error` case throw the typed error:

```ts
        case "status":
          // Progress heartbeat while Aurora resumes. Keeps the connection
          // alive; must not leak into the answer text.
          console.error(
            `keri-chat: ${event.detail ?? "waking"} (${event.elapsedMs}ms)`,
          );
          break;
        case "citations":
          citations = event.data;
          break;
        case "error":
          throw new ChatApiError(
            `Chat API error [${event.code ?? "UNKNOWN"}]: ${event.error}${event.detail ? ` — ${event.detail}` : ""}`,
            event.code,
          );
```

The block above replaces the old `citations` and `error` cases and adds `status`. Leave `case "chunk":` and `case "done":` exactly as they are. After the edit the switch should have five cases in this order: `chunk`, `status`, `citations`, `error`, `done`.

- [ ] **Step 5: Warm at startup**

In `main()`, after the existing `console.error(...)` startup line, add:

```ts
  // Trigger a resume now so the first ask_keri_chat of the session usually
  // lands on an awake cluster. Not awaited — the server must connect at once.
  void warmIfStale();
```

- [ ] **Step 6: Fail softly in the tool handler**

Replace the single call inside the tool handler (line 195):

```ts
    const result = await queryKeriChat(question, effectiveHistory);
```

with:

```ts
    await warmIfStale();

    let result: ChatResult;
    try {
      result = await queryKeriChat(question, effectiveHistory);
    } catch (err) {
      const code = err instanceof ChatApiError ? err.code : undefined;
      const timedOut =
        err instanceof Error &&
        (err.name === "TimeoutError" || err.name === "AbortError");

      if (code === "DATABASE_RESUMING" || timedOut) {
        // A throw here reads to the agent as "this server is broken". A soft
        // result reads as "ask again", which is what we actually want: the
        // attempt above has already triggered the resume.
        return {
          content: [
            {
              type: "text" as const,
              text:
                "The KERI knowledge base was waking from idle and did not " +
                "finish in time. It sleeps when unused to keep hosting costs " +
                "near zero, and takes about 25 seconds to resume. The wake " +
                "has now been triggered — ask the same question again and it " +
                "should answer normally.",
            },
          ],
          isError: true,
        };
      }
      throw err;
    }
```

Note that history is still only appended **after** a success, so a failed call cannot poison the conversation.

- [ ] **Step 7: Type-check**

```bash
cd mcp-servers/keri-chat && npx tsc --noEmit
```

Expected: exits 0. (`npm run build` still runs plain `tsc` at this point; Task 9 replaces it.)

- [ ] **Step 8: Commit**

```bash
git add mcp-servers/keri-chat/src/index.ts
git commit -m "fix(mcp): warm at startup and fail softly on a resuming database

A paused cluster made queryKeriChat throw, which the MCP SDK surfaces as a
tool error and the agent reads as the server being down — so nearly every
first ask_keri_chat of a session failed, because sessions idle past the 5
minute auto-pause. This server is long-lived, so it can trigger the resume
at startup and before a stale query. On an exhausted budget it now returns
a soft 'ask again' rather than throwing. Abort raised 55s to 150s to clear
the 90s wake budget plus generation."
```

---

### Task 9: Bundle the MCP server so a bare install can run it

**Files:**
- Modify: `mcp-servers/keri-chat/package.json`
- Modify: `.gitignore`
- Create (tracked build artifact): `mcp-servers/keri-chat/dist/index.js`

**Interfaces:**
- Consumes: Task 8's source.
- Produces: a self-contained `dist/index.js` needing no `node_modules`, consumed by Task 11's plugin declaration.

- [ ] **Step 1: Declare the missing dependency and add esbuild**

`zod` is imported by `src/index.ts` but declared nowhere — it resolves today only as a hoisted transitive dep of the MCP SDK, so an SDK bump could break the server with no code change.

```bash
cd mcp-servers/keri-chat
npm install --save zod
npm install --save-dev esbuild
```

- [ ] **Step 2: Switch the build to bundling**

In `mcp-servers/keri-chat/package.json`, replace the `scripts` block (currently `{"build": "tsc", "dev": "tsc --watch"}`) with:

```json
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=node --target=node20 --format=esm --outfile=dist/index.js --banner:js=\"import{createRequire as __cr}from'module';const require=__cr(import.meta.url);\"",
    "typecheck": "tsc --noEmit",
    "dev": "tsc --watch"
  },
```

Bundling matters because the plugin cache is a git clone: it has no `node_modules` and nothing runs `npm install` there. `tsc` alone emits a file that still `import`s the SDK at runtime.

The `--banner:js` shim is not optional decoration. `package.json` has `"type": "module"`, so the output is ESM, but `@modelcontextprotocol/sdk` and its transitive deps contain CommonJS that esbuild inlines with `require()` calls still in it — and `require` does not exist in an ESM module scope. Without the banner the bundle fails at load with `ReferenceError: require is not defined`. Step 5 is what catches this if the banner is mistyped.

- [ ] **Step 3: Un-ignore the artifact**

`.gitignore:7` is `**/dist/`. Git cannot re-include a file whose parent directory is excluded, so the negation must name the **directory**. Append to `.gitignore`:

```gitignore
# The keri-chat MCP server ships to plugin installs as a pre-bundled artifact.
# The plugin cache is a git clone with no node_modules and no build step, so
# this one dist/ is tracked deliberately. Rebuild and commit it when src/ changes.
!mcp-servers/keri-chat/dist/
```

- [ ] **Step 4: Build and confirm the artifact is no longer ignored**

```bash
cd mcp-servers/keri-chat && npm run build
cd ../.. && git check-ignore -v mcp-servers/keri-chat/dist/index.js; echo "exit=$?"
```

Expected: `exit=1` and no output, meaning the file is **not** ignored. If `exit=0`, the negation did not take — check that it sits *after* line 7 in `.gitignore`.

- [ ] **Step 5: Prove the bundle is genuinely self-contained**

This is the real test of this task: hide `node_modules` and confirm the server still starts.

```bash
cd mcp-servers/keri-chat
mv node_modules /tmp/keri-chat-node-modules-parked
node dist/index.js < /dev/null 2>&1 | head -3
mv /tmp/keri-chat-node-modules-parked node_modules
```

Expected: `keri-chat MCP server starting (endpoint: https://chat.keri.host/api/chat)`.

Two failures to recognise:

- `ERR_MODULE_NOT_FOUND` — the bundle is not self-contained. Check `--bundle` is present and nothing is marked external.
- `ReferenceError: require is not defined` — the `--banner:js` shim from Step 2 is missing or mangled by shell quoting. Verify it survived into `package.json` with `node -e "console.log(require('./package.json').scripts.build)"`.

**Restore `node_modules` even if the check fails** — the second `mv` must run.

- [ ] **Step 6: Commit**

```bash
git add mcp-servers/keri-chat/package.json \
        mcp-servers/keri-chat/package-lock.json \
        .gitignore
git add mcp-servers/keri-chat/dist/index.js
git commit -m "build(mcp): ship keri-chat as a self-contained bundle

The plugin cache is a git clone: no node_modules, and nothing runs a build
there. tsc alone emitted a file that still imported the SDK at runtime, so
installs got a server that could not start. esbuild --bundle inlines the
deps and the artifact is tracked deliberately, with a .gitignore negation
naming the directory since git cannot re-include a file under an excluded
parent. Also declares zod, which was imported but resolved only as a
hoisted transitive dependency."
```

---

### Task 10: Hosted `/mcp` handler

Cannot use heartbeats: it returns a single JSON body, so `/mcp`'s CloudFront `readTimeout: 90s` is a hard time-to-first-byte ceiling.

**Files:**
- Modify: `infrastructure/lambda/mcp-handler/index.ts`

**Interfaces:**
- Consumes: `status` events and `DATABASE_RESUMING` (Task 2).
- Produces: nothing downstream.

- [ ] **Step 1: Add the typed error and status event**

In `infrastructure/lambda/mcp-handler/index.ts`, after the `SSEDoneEvent` interface (line 22), add:

```ts
interface SSEStatusEvent {
  type: 'status';
  state: string;
  elapsedMs: number;
  detail?: string;
}

class ChatApiError extends Error {
  readonly code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ChatApiError';
    this.code = code;
  }
}
```

Then extend the union on line 24:

```ts
type SSEEvent =
  | SSEChunkEvent
  | SSECitationsEvent
  | SSEDoneEvent
  | SSEErrorEvent
  | SSEStatusEvent;
```

- [ ] **Step 2: Raise the abort just under the CloudFront ceiling**

Change line 42 from `signal: AbortSignal.timeout(80_000),` to:

```ts
    // /mcp's CloudFront readTimeout is 90s and this hop is NOT streaming, so
    // that is a hard time-to-first-byte ceiling. The effective wake budget
    // here is therefore 85s, slightly under the chat handler's 90s: on a
    // pathologically slow resume we give up first and tell the caller to ask
    // again, rather than threading a per-caller budget through the contract.
    signal: AbortSignal.timeout(85_000),
```

- [ ] **Step 3: Consume status events and throw the typed error**

In the event `switch` (lines 87-100), add a `status` case and replace the `error` case:

```ts
        case 'status':
          // Aurora wake heartbeat. Must not leak into the answer text.
          break;
        case 'error':
          throw new ChatApiError(
            `Chat API error [${event.code ?? 'UNKNOWN'}]: ${event.error}${event.detail ? ` — ${event.detail}` : ''}`,
            event.code,
          );
```

- [ ] **Step 4: Fail softly in the tool handler**

Replace the tool body's single call (line 172):

```ts
      const result = await queryKeriChat(question, history, CHAT_FN_URL);
```

with:

```ts
      let result: ChatResult;
      try {
        result = await queryKeriChat(question, history, CHAT_FN_URL);
      } catch (err) {
        const code = err instanceof ChatApiError ? err.code : undefined;
        const timedOut =
          err instanceof Error &&
          (err.name === 'TimeoutError' || err.name === 'AbortError');

        if (code === 'DATABASE_RESUMING' || timedOut) {
          // Soft result, not a throw: a throw reads as "server broken". The
          // abandoned attempt has already triggered the resume, so a repeat
          // question lands on a warming cluster.
          return {
            content: [
              {
                type: 'text' as const,
                text:
                  'The KERI knowledge base was waking from idle and did not ' +
                  'finish in time. It sleeps when unused to keep hosting costs ' +
                  'near zero, and takes about 25 seconds to resume. The wake ' +
                  'has now been triggered — ask the same question again and it ' +
                  'should answer normally.',
              },
            ],
            isError: true,
          };
        }
        throw err;
      }
```

- [ ] **Step 5: Synth, deploy, and verify**

```bash
cd infrastructure && npm run typecheck:lambda && npx cdk synth KeriChat > /dev/null && echo "OK"
./scripts/deploy.sh --profile personal
```

Then verify the endpoint still speaks MCP:

```bash
curl -s -X POST https://chat.keri.host/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | head -c 400
```

Expected: JSON listing the `ask_keri_chat` tool.

- [ ] **Step 6: Commit**

```bash
git add infrastructure/lambda/mcp-handler/index.ts
git commit -m "fix(mcp): hosted endpoint fails softly on a resuming database

This hop is not streaming, so /mcp's 90s CloudFront readTimeout is a hard
TTFB ceiling and heartbeats cannot help. Abort raised to 85s, just under
it, and a resuming database now returns a soft 'ask again' rather than a
throw the agent reads as the server being down."
```

---

### Task 11: Ship the MCP server with the plugin

This repo is already a plugin (`.claude-plugin/plugin.json`, name `keri`) published through the `keri-skills` marketplace from GitHub `seriouscoderone/keri-claude`. It has never declared an MCP server, so installs got the skills and no `ask_keri_chat` at all.

**Files:**
- Modify: `.claude-plugin/plugin.json`
- Delete: `.claude/settings.json`
- Modify: `CLAUDE.md`
- Modify: `skills/chat/SKILL.md`

**Interfaces:**
- Consumes: the bundled artifact from Task 9.
- Produces: `ask_keri_chat` for every plugin install.

- [ ] **Step 1: Declare the server in the plugin manifest**

The docs allow either a `.mcp.json` at the plugin root or an inline `mcpServers` in `plugin.json`. Use inline: a root `.mcp.json` would **also** be read as this repo's own project-scope config, where `${CLAUDE_PLUGIN_ROOT}` does not resolve.

In `.claude-plugin/plugin.json`, add an `mcpServers` key after `"license": "Apache-2.0",`:

```json
  "mcpServers": {
    "keri-chat": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/mcp-servers/keri-chat/dist/index.js"]
    }
  },
```

`${CLAUDE_PLUGIN_ROOT}` is absolute, which retires the cwd fragility: the old relative path failed with `MODULE_NOT_FOUND` whenever Claude Code ran from anywhere but the repo root.

- [ ] **Step 2: Remove the superseded project wiring**

`.claude/settings.json` contained nothing but the old relative-path `mcpServers` block, and is now redundant — and keeping it would double-register the server when working in this repo.

```bash
git rm .claude/settings.json
```

- [ ] **Step 3: Document the directory and the tracked artifact**

`mcp-servers/` appears nowhere in `CLAUDE.md` today. In the repository-structure block, add it after the `.claude/skills/...` entries and before `infrastructure/`:

```
mcp-servers/
  keri-chat/            # stdio MCP server exposing ask_keri_chat
    src/index.ts        # source
    dist/index.js       # TRACKED esbuild bundle — see note below
```

Then add this section after the "Skills Architecture" section:

```markdown
## The keri-chat MCP server

`mcp-servers/keri-chat/` is a stdio MCP server exposing the `ask_keri_chat`
tool against the hosted knowledge base. It is declared in
`.claude-plugin/plugin.json` under `mcpServers`, so every plugin install gets
it — there is no project-level MCP config.

**`dist/index.js` is a tracked build artifact.** The plugin cache is a git
clone with no `node_modules` and no build step, so the committed file must be
self-contained. `npm run build` bundles it with esbuild.

**After changing `src/`, rebuild and commit the bundle:**

```bash
cd mcp-servers/keri-chat
npm run build && npm run typecheck
git add dist/index.js src/index.ts
```

Forgetting this ships stale behaviour to every install. Verify the bundle is
self-contained by moving `node_modules` aside and running
`node dist/index.js < /dev/null` — it must print its startup line.

Changes to `plugin.json` need `/reload-plugins` or a restart to take effect.
```

- [ ] **Step 4: Document the new error code in the skill**

In `skills/chat/SKILL.md`, add to the `### Error codes` list, after the `THROTTLED` entry:

```markdown
- `DATABASE_RESUMING` — the knowledge base was waking from idle and did not
  finish within the server's 90s budget. The attempt itself triggers the
  resume, so simply asking again usually succeeds within a few seconds.
```

Then add this note immediately after the `## How to Query` heading's first paragraph:

```markdown
> The knowledge base runs on Aurora Serverless v2 at zero minimum capacity, so
> it sleeps after about five minutes idle and takes ~25s to resume. The server
> waits through a resume and streams `status` events while it does, and the MCP
> server triggers a resume at startup, so this is usually invisible.
```

- [ ] **Step 5: Commit**

```bash
git add .claude-plugin/plugin.json CLAUDE.md skills/chat/SKILL.md
git commit -m "feat(plugin): ship the keri-chat MCP server with the plugin

The plugin never declared an MCP server, so installs got the skills and no
ask_keri_chat — the only wiring was .claude/settings.json, a project file
that is inert in the plugin cache and only ever worked inside this repo.
Declared inline in plugin.json rather than a root .mcp.json, which would
also be read as this repo's project config where CLAUDE_PLUGIN_ROOT does
not resolve. That variable is absolute, so the old MODULE_NOT_FOUND from
running outside the repo root is gone too."
```

- [ ] **Step 6: Verify a real install end to end**

The installed plugin is pinned at `ba4fc516` (2026-02-26), 303 commits behind, so none of this reaches it until it is updated.

Push, then in Claude Code:

```
/plugin update keri@keri-skills
/reload-plugins
```

Then confirm, in a session started from a **subdirectory** (the case that used to fail outright):

```bash
cd infrastructure && claude
```

Ask something that routes to the tool, e.g. *"Use ask_keri_chat: what is pre-rotation in KERI?"*

Expected: the tool answers with citations. Previously this combination failed two ways at once — `MODULE_NOT_FOUND` from the relative path, and a tool error on any cold cluster.

Finally, confirm the zero-setup claim on a clean clone:

```bash
git clone https://github.com/SeriousCoderOne/keri-claude /tmp/keri-clone
node /tmp/keri-clone/mcp-servers/keri-chat/dist/index.js < /dev/null 2>&1 | head -2
rm -rf /tmp/keri-clone
```

Expected: the startup line, with no `npm install` and no build.

---

## Verification Checklist

Maps 1:1 onto the spec's Verification section.

- [ ] `isAuroraWakeError` returns `true` for the verbatim production message and `false` for unknown-KB and bad-model-ARN messages (Task 1, `npm test`)
- [ ] A non-wake error reaches the caller with the operation attempted exactly once (Task 1)
- [ ] `/api/chat` against a paused cluster answers in ~25-35s, having emitted `status` events, instead of failing in ~4s (Task 4 Step 6)
- [ ] CloudFront does not time out during the wait, proving heartbeats reset the 60s idle timer (Task 4 Step 6 — the request completes rather than returning a 504)
- [ ] `/api/warm` returns promptly and the cluster leaves 0 ACU (Task 4 Step 4)
- [ ] `aurora_wake_detected` and `aurora_wake_complete` appear in CloudWatch, proving the retry fired rather than the cluster happening to be awake (Task 4 Step 7)
- [ ] With warm-on-load enabled, a message sent ~20s after page load shows no wait (Task 7 Step 6)
- [ ] `ask_keri_chat` succeeds on the first call of a session against a cold cluster, and when started from a subdirectory (Task 11 Step 6)
- [ ] A fresh clone yields a runnable server with no `npm install` and no build step (Task 9 Step 5, Task 11 Step 6)
- [ ] `cdk diff` showed `MinCapacity 0.5 → 0` plus the new auto-pause duration and nothing unrelated (Task 4 Step 2)
