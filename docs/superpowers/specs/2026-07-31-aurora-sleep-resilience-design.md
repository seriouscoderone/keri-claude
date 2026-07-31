# Aurora Sleep Resilience — Design

**Date:** 2026-07-31
**Status:** Approved, ready for planning

## Goal

Aurora Serverless v2 backing the KeriChat knowledge base runs at
`serverlessV2MinCapacity: 0` and auto-pauses after 300s idle. That is a
deliberate cost decision and stays. Resuming is normal behaviour, not a fault.

Today nothing in the system knows that. Every entry point — the web UI, the
hosted MCP endpoint, and the local stdio MCP server — reports a paused cluster
as an internal error. This design makes all three tolerate the wake, and makes
the wake usually invisible by triggering it ahead of the first query.

## Evidence

All figures measured against the live deployment on 2026-07-31, not assumed.

**The cluster was genuinely at 0 ACU** (CloudWatch `ServerlessDatabaseCapacity`)
when a request was sent to `https://chat.keri.host/api/chat`. It returned in
**4.1 seconds** with:

```
data: {"type":"error","error":"Internal server error","code":"INTERNAL_ERROR",
       "detail":"An unexpected error occurred. Please try again later."}
```

The CloudWatch log for that invocation carries the real cause:

```
ValidationException: The vector database encountered an error while processing
the request: The Aurora DB instance db-7RXOGRKA37S5FWCZVG2JMGFO4I is resuming
after being auto-paused. Please wait a few seconds and try again.
(Service: RdsData, Status Code: 400) (SDK Attempt Count: 1)
    at async retrieveChunks (/var/task/index.js:83:20)
  '$fault': 'client',
  '$metadata': { httpStatusCode: 400, attempts: 1, totalRetryDelay: 0 }
```

**Resume latency: 25 seconds.** A polling loop against a confirmed-paused
cluster failed at t=4s, 11s, 17s and succeeded at **t=25s**.

**Wind-down:** 3.0 → 2.37 → 1.5 → 1.5 → 0.0 ACU over roughly five minutes after
last use. A wake therefore costs on the order of $0.03 in compute.

### Where the failure surface is

`retrieveChunks` — the `Retrieve` call in `infrastructure/lambda/chat-handler/index.ts`
— is the **only** step that touches Aurora. Query reformulation and answer
generation are pure Bedrock and are unaffected. This is a single-call-site problem.

The error is neither a known shape in `writeErrorSSE` nor retried by the SDK
(`attempts: 1`, and the SDK is correct per its own model: `$fault: "client"`
with no retryable trait). So it falls through to the generic `INTERNAL_ERROR`.

### Two corrections to the original framing

**There is no API Gateway, and the ceiling is not 30s.** The path is
CloudFront → Lambda Function URL in `RESPONSE_STREAM` mode. The Lambda timeout
is **300s**; the binding constraint is CloudFront's `/api/*`
`readTimeout: 60s`. Because the response is a *stream*, that 60s is idle time
*between bytes*, not total duration — so emitting SSE heartbeats while waiting
stops it from bounding the wait at all. The existing streaming architecture
already contains the escape hatch.

**The sla repo's fix cannot be copied verbatim.** In `~/code/sla` the error
arrived as `DatabaseResumingException`, which is safe to allowlist by class name.
Here Bedrock rewraps it as `ValidationException`, which also covers bad model
ARNs, unknown knowledge-base ids, and malformed parameters. Allowlisting that
name would retry a configuration typo for the full budget instead of failing
fast. **Discrimination must be on message wording, not class name.**

## The MCP problem is the same problem

`ask_keri_chat` appearing broken has one shared cause and three independent
aggravating defects.

**Shared cause.** `queryKeriChat` throws on the `error` SSE event and the tool
handler does not catch it, so the MCP SDK surfaces a tool error and the calling
agent reads it as the server being down. Because a coding session naturally has
gaps longer than the 300s auto-pause, *nearly every first `ask_keri_chat` call
in a session fails this way*.

**Defect 1 — the plugin does not ship the server.** This repo already is a
Claude Code plugin: `.claude-plugin/plugin.json` (name `keri`) and
`.claude-plugin/marketplace.json` (`keri-skills`) are both tracked, and the
marketplace is registered from GitHub `seriouscoderone/keri-claude`. But
`plugin.json` declares no `mcpServers` and there is no `.mcp.json`. The only
wiring is in `.claude/settings.json` — a *project* settings file, which is
copied into the plugin cache but inert there. Anyone who installs the plugin
gets the skills and no `ask_keri_chat` at all.

**Defect 2 — nothing runnable reaches the plugin cache.** `.gitignore:7`
(`**/dist/`) and `:8` (`**/node_modules/`) mean only `src/index.ts` is tracked.
`tsc` transpiles without bundling, so even a built `dist/index.js` imports
`@modelcontextprotocol/sdk` and `zod` at runtime. Locally it works only because
a February build and its `node_modules` still exist on disk.

**Defect 3 — the path is relative.** `"args": ["mcp-servers/keri-chat/dist/index.js"]`
resolves against Claude Code's cwd, so from any subdirectory:

```
Error: Cannot find module '…/infrastructure/mcp-servers/keri-chat/dist/index.js'
  code: 'MODULE_NOT_FOUND'
```

**Also latent:** `zod` is imported but declared in neither `dependencies` nor
`devDependencies`; it resolves purely as a hoisted transitive dep of the MCP SDK.
And `AbortSignal.timeout(55_000)` would truncate a wake even after the backend
fix.

### Why the local stdio server, not the hosted endpoint

Counter-intuitively the long-lived local server is the more resilient
architecture for this specific problem:

| | Local stdio | Hosted `/mcp` |
|---|---|---|
| Talks to | `/api/chat` — streaming, so heartbeats keep the wake alive | itself — single JSON body, hard 90s CloudFront TTFB ceiling |
| Lifetime | long-lived subprocess → **can warm at startup** | stateless per call → cannot warm |
| Extras | auto-accumulated history; `~/.claude/keri-chat-log.jsonl` | history passed explicitly; no log |

The hosted endpoint stays supported and gets its error handling fixed, but the
plugin ships the stdio server.

## Decisions

| Decision | Ruling | Rationale |
|---|---|---|
| Discrimination | Message wording, plus `DatabaseResumingException` by name as a second net | `ValidationException` is overloaded; matching it by name would retry config errors |
| Where the predicate lives | One module, `infrastructure/lambda/shared/aurora-wake.ts` | Only the chat handler sees the raw AWS error; everything downstream keys off the wire contract |
| Wake budget (`/api/chat`) | **90s**, fixed 3s interval | 3.6× the measured 25s. Fixed rather than exponential: a resume is a binary state flip, and back-off can oversleep past readiness |
| Keeping CloudFront alive | SSE `status` events on every retry | Bytes reset the 60s idle timer, and the same events drive the progress message. One mechanism, two jobs |
| Retry via SDK middleware | **Rejected** | Middleware sits below the handler with no access to the response stream, so it cannot emit heartbeats — the wait would be capped at 60s and the user would see a bare spinner |
| Warm cadence | On page load, and on first keystroke when the last warm is >4 min old | Ties every wake to genuine intent. Rejected periodic keepalive: a tab left open would keep the cluster awake all day, defeating the cost saving |
| Warm endpoint | `/api/warm` on the existing handler, no retry loop | Verified that `/api/*` reaches the Lambda with the path intact, so this needs no new infrastructure and no new IAM. One call is enough to *trigger* a resume |
| Frontend retry | Exactly one auto-resend after 3s, then a Retry button | Bounded. Each attempt costs a full invocation plus a reformulation model call |
| MCP delivery | Bundled single file, tracked in git, declared inline in `plugin.json` | Zero-setup for installers while keeping warm-on-startup and heartbeat-backed streaming |
| `mcpServers` location | Inline in `.claude-plugin/plugin.json`, not a root `.mcp.json` | A root `.mcp.json` is also read as this repo's project config, where `${CLAUDE_PLUGIN_ROOT}` does not resolve. Inline keeps one unambiguous declaration |
| MCP failure mode | Soft `isError` result, never a throw | A throw reads as "server down"; a soft result invites the agent to ask again |
| `serverlessV2MinCapacity` | Unchanged at 0 | Scale-to-zero is the point. Clients tolerate the wake rather than paying to prevent it |
| Scheduled keepalive / provisioned capacity | **Not doing** | Directly defeats the motivating cost saving |

## Architecture

### 1. `infrastructure/lambda/shared/aurora-wake.ts` — new

The single place that knows what a resuming cluster looks like.

```ts
// Discriminated on message wording, NOT on err.name. Bedrock rewraps the RDS
// Data API error as ValidationException, which also covers bad model ARNs,
// unknown knowledge-base ids, and malformed parameters — retrying those for
// 90s would turn a config typo into a silent hang.
const WAKE_MESSAGES = [
  'is resuming after being auto-paused',   // measured verbatim, 2026-07-31
  'DB cluster is paused',
  'cluster is being resumed',
  'Communications link failure',
  'temporarily unavailable',
];

export function isAuroraWakeError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  // Second net: if Bedrock ever stops rewrapping and passes the class through.
  if (err.name === 'DatabaseResumingException') return true;
  return WAKE_MESSAGES.some((s) => err.message.includes(s));
}

export async function retryWhileWaking<T>(
  op: () => Promise<T>,
  opts: { timeoutMs: number; onWaking?: (elapsedMs: number, attempt: number) => void },
): Promise<T>
```

`retryWhileWaking` throws `AuroraWakeTimeout` (carrying attempts and elapsed ms)
when the budget is exhausted. `onWaking` is the seam that lets the caller emit
heartbeats without this module knowing anything about SSE.

### 2. The SSE contract — additive

A new event type and a new error code:

```
data: {"type":"status","state":"waking","elapsedMs":6000,
       "detail":"Waking the knowledge base…"}

data: {"type":"error","code":"DATABASE_RESUMING","error":"Knowledge base is waking up",
       "detail":"The database sleeps when idle to save cost. It should be ready in about 30 seconds — please try again."}
```

**This is backward compatible.** Every existing consumer (`frontend/src/api/chat.ts`,
`lambda/mcp-handler/index.ts`, `mcp-servers/keri-chat/src/index.ts`) dispatches
on `event.type` in a `switch` with no `default`, so an unrecognised `status`
event is silently ignored. An un-upgraded client sees exactly today's behaviour,
never a crash. The curl recipe in `skills/chat/SKILL.md` filters on
`.type=="chunk"` and is likewise unaffected.

### 3. `/api/chat` — retry with heartbeats

`retrieveChunks` becomes the only wrapped call:

```ts
const chunks = await retryWhileWaking(
  () => retrieveChunks(reformulatedQuery),
  {
    timeoutMs: 90_000,
    onWaking: (elapsedMs) => writeSSE(httpStream, {
      type: 'status', state: 'waking', elapsedMs,
      detail: 'Waking the knowledge base…',
    }),
  },
);
```

`writeErrorSSE` gains an `AuroraWakeTimeout` branch emitting `DATABASE_RESUMING`,
placed **before** the existing generic fallback. Structured logs
(`aurora_wake_detected`, `aurora_wake_complete` with attempt count and latency)
make the retry observable in CloudWatch.

### 4. `/api/warm` — new branch, no new infrastructure

Verified: `POST https://chat.keri.host/api/warm` already reaches this Lambda
with the path preserved (it returned the handler's own `BAD_REQUEST`). The
`/api/*` CloudFront behavior needs no change and the function already holds
`bedrock:Retrieve`.

The handler branches on `event.rawPath` **before** parsing a chat body, and:

- issues one `Retrieve` with `numberOfResults: 1` and a trivial query
- swallows a wake error — its purpose is only to *trigger* the resume
- returns `{"status":"warming"}` or `{"status":"ready"}` and ends

No retry loop, no reformulation, no generation. Returns in a few seconds.

### 5. Frontend

`api/chat.ts`:
- `warm()` — `POST /api/warm`, fire-and-forget, never surfaces an error
- `streamMessage` gains an `onStatus` callback; `status` events route to it
- `DATABASE_RESUMING` maps to a `ChatApiError` carrying that code

`hooks/useChat.ts`:
- `warmIfStale()` — no-op when a `sessionStorage` timestamp is under 4 minutes old
- called on mount, and from the composer on first keystroke of an empty input
- `wakeStatus` state rendered in the assistant placeholder — "Waking the
  knowledge base… 18s" — replacing the bare spinner
- one auto-resend, after 3s, when the failure is `DATABASE_RESUMING` **or** the
  stream ended with zero content received. A second failure surfaces the error
  with a Retry button.

The retry must not double-append to `messages`: the placeholder assistant
message is reused, not re-added.

### 6. Local MCP server (`mcp-servers/keri-chat/`)

| Change | Detail |
|---|---|
| Bundle | `npm run build` → `esbuild --bundle --platform=node --format=esm --outfile=dist/index.js`, producing one self-contained file with no runtime `node_modules` |
| Track the artifact | Add `!mcp-servers/keri-chat/dist/` to `.gitignore`, overriding the `**/dist/` rule on line 7. Verified: `git check-ignore` reports the path as no longer ignored, so no `git add -f` is needed. Git cannot re-include a file whose parent directory is excluded, so the negation must name the **directory** |
| Declare `zod` | Move it into `dependencies`, and add `esbuild` to `devDependencies` |
| Warm at startup | Fire `/api/warm` when the server boots, and again before a query when the last warm is >4 min old — the analogue of the frontend behaviour, and the reason a cold DB usually never surfaces to the agent |
| Raise the abort | `AbortSignal.timeout(55_000)` → `150_000`. It must exceed the 90s wake budget **plus** generation: a worst-case 90s wake followed by ~40s of streaming is ~130s, which a 120s abort would truncate just before the answer completed. Nothing else bounds this hop — `/api/chat` streams, so CloudFront's 60s is idle-time-between-bytes |
| Soft failure | On `DATABASE_RESUMING`, return `{ content: [...], isError: true }` explaining the base was waking and to ask again — **not** a throw |
| Handle `status` | Consume `status` events so they never leak into the answer text |

### 7. Hosted MCP handler (`infrastructure/lambda/mcp-handler/`)

Cannot use heartbeats — it returns a single JSON body, so `/mcp`'s
`readTimeout: 90s` is a hard time-to-first-byte ceiling. Its inner hop goes
straight to the function URL and bypasses CloudFront, so only that outer 90s
applies; a 25s wake plus generation fits inside it.

- `AbortSignal.timeout(80_000)` → `85_000`, just under the 90s ceiling
- on `DATABASE_RESUMING` **or** an abort, return a soft `isError` result rather
  than throwing
- consume `status` events without appending them to the answer

This means the hosted path's **effective** wake budget is 85s rather than the
handler's 90s: on a pathologically slow resume the MCP handler gives up while the
chat handler is still retrying. That is accepted rather than papered over — the
soft `isError` tells the agent to ask again, and the abandoned invocation has
already triggered the resume, so the next call lands on a warming cluster. The
alternative, threading a shorter per-caller budget into the chat handler, adds a
parameter to the wire contract to save five seconds.

### 8. Plugin packaging

`.claude-plugin/plugin.json` gains:

```json
"mcpServers": {
  "keri-chat": {
    "command": "node",
    "args": ["${CLAUDE_PLUGIN_ROOT}/mcp-servers/keri-chat/dist/index.js"]
  }
}
```

`${CLAUDE_PLUGIN_ROOT}` is absolute, which retires the cwd fragility entirely.
The `mcpServers` block is then **removed** from `.claude/settings.json`, leaving
one source of truth; local development against unreleased changes uses an
untracked `.claude/settings.local.json`.

`CLAUDE.md` gains a `mcp-servers/` entry in the repository-structure block (it is
absent today) plus a note that `dist/index.js` is a tracked build artifact and
must be rebuilt and committed when `src/` changes.

`skills/chat/SKILL.md` gains the `DATABASE_RESUMING` code in its error-code list
and a short note that the knowledge base sleeps when idle.

**Operational note, not code:** the installed plugin is pinned at `ba4fc516`
(2026-02-26), 303 commits behind, missing three skills. None of the above
reaches the installed copy until the plugin is updated, and `/reload-plugins`
or a restart is required for `plugin.json` changes to take effect.

### 9. CDK

```ts
serverlessV2MinCapacity: 0,                              // already committed, never deployed
serverlessV2AutoPauseDuration: cdk.Duration.minutes(5),  // new — currently live-state only
```

The deployed CloudFormation template still carries `MinCapacity: 0.5` while the
live cluster reports `0.0`, so the committed value has never been deployed and
the live setting came from a manual change. Deploying reconciles that drift.
`SecondsUntilAutoPause: 300` exists only in live state today; declaring it makes
the configuration reproducible from code.

## Error handling

| Condition | Behaviour |
|---|---|
| Cluster resuming, clears within 90s | Retried at 3s intervals; caller sees `status` events then a normal answer. `aurora_wake_complete` logged with attempts and latency |
| Cluster resuming past 90s | `DATABASE_RESUMING`. Browser auto-resends once; MCP returns a soft "ask again" |
| Genuine `ValidationException` (bad model ARN, unknown KB id) | Rethrown on the **first** attempt, unretried — the load-bearing negative case |
| Warm call hits a paused cluster | Expected. Error swallowed, `{"status":"warming"}` returned; the call has already triggered the resume |
| Warm call fails for any other reason | Swallowed. Warming is an optimisation and must never surface an error or block sending |
| Existing error shapes (`MODEL_ACCESS_REQUIRED`, `MARKETPLACE_SUBSCRIPTION`, `THROTTLED`) | Unchanged, and still matched ahead of the new branch |

## Testing

The repo has **no test runner in any package** — `infrastructure/`,
`mcp-servers/keri-chat/`, and `infrastructure/frontend/` all lack one. This adds
vitest to `infrastructure/` only, scoped to the one module whose failure mode is
silent.

`aurora-wake.test.ts`:

| Input | Expected |
|---|---|
| `ValidationException` with the verbatim 2026-07-31 production message | `true` — the regression test |
| Each entry in `WAKE_MESSAGES` | `true` (parametrised) |
| `DatabaseResumingException` with an unrelated message | `true` |
| **`ValidationException`: unknown knowledge-base id** | **`false`** |
| **`ValidationException`: bad model ARN / malformed parameter** | **`false`** |
| `AccessDeniedException`, `ThrottlingException` | `false` |
| Non-`Error` values (string, `null`, `undefined`) | `false` |

The two bold rows are load-bearing: if either flips, a configuration typo
becomes a 90-second hang instead of an immediate, legible failure.

`retryWhileWaking`: succeeds first try with no sleep and no `onWaking` call;
succeeds after two wake errors; **rethrows a non-wake error with `op` called
exactly once**; throws `AuroraWakeTimeout` past the deadline with attempts and
elapsed recorded. Driven with `vi.useFakeTimers()` and
`advanceTimersByTimeAsync`, which also mocks `Date.now()` — the deadline
arithmetic depends on that.

**End-to-end, against a genuinely paused cluster.** Repeatable: confirm 0 ACU via
`ServerlessDatabaseCapacity`, then measure. Baseline recorded today is
**fail at ~4s**; target is **answer at ~25s** with `aurora_wake_detected` in the
log proving the retry fired rather than the cluster happening to be awake. A run
against an already-awake cluster is a non-result, not a pass.

**Manual checks:** MCP server started from a subdirectory now connects;
`ask_keri_chat` against a paused cluster returns an answer rather than a tool
error; the web UI shows the waking message rather than a spinner; `/api/warm`
returns promptly and leaves the cluster resuming.

## Verification

1. `isAuroraWakeError` returns `true` for the verbatim production message and
   `false` for unknown-KB and bad-model-ARN messages.
2. A non-wake error reaches the caller with the operation attempted exactly once.
3. `/api/chat` against a paused cluster answers in ~25s, having emitted `status`
   events, instead of failing in ~4s.
4. CloudFront does not time out during the wait — proving heartbeats reset the
   60s idle timer.
5. `/api/warm` returns in a few seconds and the cluster leaves 0 ACU.
6. With warm-on-load enabled, a message sent ~20s after page load shows no wait.
7. `ask_keri_chat` succeeds on the first call of a session against a cold
   cluster, and started from a subdirectory.
8. A fresh `git clone` plus `/plugin install` yields a working `ask_keri_chat`
   with no `npm install` and no build step.
9. `cdk diff` shows `MinCapacity 0.5 → 0` plus the new auto-pause duration, and
   nothing unrelated.

## Sequencing

The change spans five areas but is one defect with several consumers, held
together by the SSE contract in §2 — splitting it would mean shipping a contract
with no producer or a consumer with no contract. Suggested order:

1. **Shared module + tests** (§1) — the predicate, with the negative cases
   locked down before anything depends on it.
2. **Chat handler** (§3, §4) — retry, heartbeats, `DATABASE_RESUMING`, `/api/warm`.
3. **Deploy and measure** (§9) — CDK drift closed in the same deploy, then
   re-run the end-to-end measurement against a paused cluster. This is the gate:
   if step 2 did not actually change the 4s failure into a 25s answer, nothing
   downstream is worth building.
4. **Frontend** (§5) — warm-on-load, status rendering, single auto-resend.
5. **MCP servers and plugin packaging** (§6, §7, §8) — last, because verification
   step 8 needs a fresh clone of everything above.

## Out of scope

- **Making the hosted `/mcp` endpoint streaming.** It would let heartbeats work
  there too, but it is a transport change to the MCP handler and the 90s ceiling
  already accommodates a 25s wake plus generation.
- **Test runners for `frontend/` and `mcp-servers/`.** Worth having, but adding
  them here would widen this change well past the defect.
- **The `INTERNAL_ERROR` fallback echoing nothing useful for other failures.**
  Unchanged; only the wake case gains a specific code.
- **Refreshing the stale installed plugin.** An operational step for the user,
  noted above, not code in this change.
