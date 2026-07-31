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
