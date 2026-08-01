# Aurora Sleep Resilience — Known Follow-ups

Companion to `2026-07-31-aurora-sleep-resilience-design.md`. These were found
during eleven task reviews and one whole-branch review, triaged, and
**deliberately shipped**. None blocks correctness; all are recorded so nobody
has to rediscover them.

Ordered roughly by value.

## Worth doing

**Make the warm path observable when it is healthy.** `/api/warm` logs only
inside its `catch` (`infrastructure/lambda/chat-handler/index.ts`), and the
frontend swallows warm failures silently by design. So you can tell when
warming breaks, but never that it is working. Moving the log outside the catch
would fix half of it; a counter or a `console.debug` on the client would fix
the rest.

**Narrow the `'temporarily unavailable'` wake fragment.**
`infrastructure/lambda/shared/aurora-wake.ts` matches five message fragments;
this is much the broadest. The plausible real source of that wording on
`Retrieve` is `ServiceUnavailableException`, which is itself transient and
worth retrying — so the worst case is a slightly wrong message after 90s, never
a hang. Still, it is the one fragment that could match something that is not an
Aurora resume.

**The spec's Retry button was never built.** The design's Decisions table says
"exactly one auto-resend after 3s, then a Retry button". The implementation
plan never asked for one, so it was dropped rather than built wrongly.
`ChatWindow.tsx` renders the error text — which for `DATABASE_RESUMING` already
says "please try again" — but offers no affordance. Either add a button that
re-invokes `send` with the last user message, or amend the spec.

**Split `chat-handler/index.ts`.** Now ~410 lines mixing request parsing, the
warm branch, prompt assembly, retrieval, streaming, and error mapping. A
pre-existing tangle this work added to; splitting it mid-project would have
enlarged the diff far past the defect.

## Small and opportunistic

- `if (!isWaking && !droppedEmpty) break;` (`useChat.ts`) reads as a double
  negative. A positive `shouldRetry` would be harder to invert by accident.
  Its correctness was independently re-derived twice.
- `path.endsWith('/warm')` also matches `/api/anything/warm`. Only `/api/*`
  reaches the Lambda, so the blast radius is one accidental path, but an exact
  match on `/api/warm` is tighter.
- `err.name === 'AbortError'` branches are currently dead — signals come only
  from `AbortSignal.timeout()`, which rejects with `TimeoutError`. Harmless,
  and live the moment anyone introduces an `AbortController`.
- Task 7 dropped an explanatory comment about why the loading block is gated on
  `isLoading && last message empty`. That gate did not change and still
  warrants the explanation. Restore it if you touch the file.
- `await warmIfStale()` at the top of the local MCP tool handler is serial,
  adding up to 10s on the first call. It only fires when the TTL has lapsed —
  exactly when warming first is genuinely useful — and against a paused cluster
  the probe returns in ~4s.
- `@aws-sdk/*` devDependency pins were never reconciled against the SDK version
  the Lambda runtime actually provides. Types-only, since `externalModules`
  keeps them out of the bundle, and Task 4 exercised these exact calls against
  the real runtime end to end.

## Deliberate, do not "fix"

- **The committed bundle** (`mcp-servers/keri-chat/dist/index.js`) is tracked on
  purpose: the plugin cache is a bare git clone with no `node_modules` and no
  build step. It must only ever be produced by `npm run build` — never `tsc`,
  which emits a non-self-contained file. `.gitignore` re-excludes `dist/*.d.ts`
  and `dist/*.map` so only the bundle is trackable.
- **The soft-failure block is duplicated** between `mcp-servers/keri-chat/` and
  `infrastructure/lambda/mcp-handler/`. Two separate npm packages with no shared
  build or workspace; extracting ~10 lines would mean bundling across package
  boundaries.
- **The hosted `/mcp` abort is 85s while the chat handler's wake budget is 90s.**
  `/mcp` is non-streaming, so CloudFront's 90s is a hard time-to-first-byte
  ceiling. On a slow resume it gives up first and returns "ask again"; the
  abandoned attempt has already triggered the resume.
- **`SSEStatusEvent.state` is declared and never read** in all three consumers —
  shape fidelity with the producer.
- **`serverlessV2MinCapacity` stays 0**, with no scheduled keepalive and no
  provisioned capacity. Scale-to-zero is the entire point.

## Verified behaviour worth not re-deriving

Measured 2026-07-31 against a cluster confirmed at 0.0 ACU:

- Aurora resume takes **~25s** (`aurora_wake_complete` logged
  `resume_latency_ms: 23492` on a 3-attempt retry).
- A cold `/api/chat` request answers in **~37s** with three `status`
  heartbeats. The pre-change baseline failed in **4.1s**.
- Capacity winds down **3.0 → 1.5 → 0** over roughly five minutes after last
  use, so a cluster is not paused the moment traffic stops.
- Claude Code applies **no per-request timer to stdio MCP servers**; the wall
  clock defaults to ~28h and the stdio idle window to 30 min. HTTP servers do
  get a 60s per-request timer unless `timeout` is set — which is why the hosted
  `/mcp` config documents `"timeout": 120000`.
