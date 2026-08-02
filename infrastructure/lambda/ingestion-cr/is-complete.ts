import { getLatestIngestion, startIngestion, type IngestionOutcome } from '../shared/ingestion';

/**
 * Polled by cr.Provider until it returns IsComplete: true, or throws.
 *
 * Two things this has to balance:
 *
 * 1. A genuinely broken ingestion must fail the deploy. Before this existed, a
 *    handler error counted as success and the KB could be stale with nothing
 *    saying so.
 * 2. It must never let CloudFormation hit its own one-hour ceiling, which fails
 *    the resource with a useless "did not receive a response" no matter how
 *    healthy the job is.
 *
 * So the rule is: fail on evidence of breakage, accept on lack of it. Past the
 * deadline a job that is still progressing is handed off to the daily schedule
 * rather than failing a deploy that is doing nothing wrong.
 *
 * Why it re-queries the newest job instead of the id on-event handed over: a
 * first-time ingestion outlives Aurora's 5-minute auto-pause, and Bedrock's own
 * pipeline then fails individual files with "is resuming after being
 * auto-paused". Those files are fine; the cure is another job, which Bedrock
 * runs incrementally over only what is missing.
 */
export const handler = async (event: {
  RequestType: 'Create' | 'Update' | 'Delete';
  Data?: { IngestionJobId?: string; Deadline?: string };
}) => {
  if (event.RequestType === 'Delete') return { IsComplete: true };

  const knowledgeBaseId = process.env.KNOWLEDGE_BASE_ID!;
  const dataSourceId = process.env.DATA_SOURCE_ID!;

  const outcome: IngestionOutcome | undefined = await getLatestIngestion(
    knowledgeBaseId,
    dataSourceId,
  );
  if (!outcome) throw new Error('No ingestion job found for this data source');

  const failed = outcome.statistics?.numberOfDocumentsFailed ?? 0;
  const indexed =
    (outcome.statistics?.numberOfNewDocumentsIndexed ?? 0) +
    (outcome.statistics?.numberOfModifiedDocumentsIndexed ?? 0);

  // on-event stamps this; absent means "no budget", i.e. wait indefinitely and
  // let the provider's own totalTimeout be the backstop.
  const deadline = Number(event.Data?.Deadline ?? 0);
  const expired = deadline > 0 && Date.now() > deadline;

  console.log(
    JSON.stringify({
      level: 'INFO',
      event: 'ingestion_poll',
      jobId: outcome.ingestionJobId,
      status: outcome.status,
      indexed,
      failed,
      budgetExpired: expired,
    }),
  );

  switch (outcome.status) {
    case 'COMPLETE': {
      if (failed === 0) {
        console.log(
          JSON.stringify({
            level: 'INFO',
            event: 'ingestion_complete',
            jobId: outcome.ingestionJobId,
            statistics: outcome.statistics,
          }),
        );
        return {
          IsComplete: true,
          Data: { Statistics: JSON.stringify(outcome.statistics ?? {}) },
        };
      }

      if (indexed === 0) {
        // No progress at all: another job would do the same thing.
        throw new Error(
          `Ingestion job ${outcome.ingestionJobId} completed with ${failed} failed ` +
            `document(s) and indexed nothing new, so retrying cannot help. ` +
            `Reasons: ${(outcome.failureReasons ?? ['none reported']).slice(0, 3).join(' | ')}`,
        );
      }

      if (expired) {
        // Progress was real but the budget is gone. The daily schedule will
        // sweep up the stragglers; failing the deploy here would condemn a
        // stack whose only sin is a large corpus.
        console.log(
          JSON.stringify({
            level: 'WARN',
            event: 'ingestion_incomplete_at_deadline',
            jobId: outcome.ingestionJobId,
            indexed,
            failed,
            note: 'accepted; daily ingestion rule will retry the failed documents',
          }),
        );
        return {
          IsComplete: true,
          Data: {
            Statistics: JSON.stringify(outcome.statistics ?? {}),
            IncompleteAtDeadline: 'true',
          },
        };
      }

      // Sweep up whatever the sleeping vector store dropped.
      let next: string;
      try {
        // Short budget: this runs inside a polled Lambda, so "not right now" is
        // not an error — the next poll retries. A long internal retry outlives
        // the Lambda timeout, and a Lambda that dies mid-call sends
        // CloudFormation nothing at all.
        next = await startIngestion(knowledgeBaseId, dataSourceId, { timeoutMs: 20_000 });
      } catch (err) {
        console.log(
          JSON.stringify({
            level: 'WARN',
            event: 'ingestion_retry_start_deferred',
            reason: (err as Error).message.slice(0, 160),
          }),
        );
        return { IsComplete: false };
      }
      console.log(
        JSON.stringify({
          level: 'WARN',
          event: 'ingestion_retry_after_partial_failure',
          previousJobId: outcome.ingestionJobId,
          retryJobId: next,
          indexed,
          failed,
        }),
      );
      return { IsComplete: false };
    }

    case 'FAILED':
    case 'STOPPED':
      // Evidence of breakage — fail regardless of the budget.
      throw new Error(
        `Ingestion job ${outcome.ingestionJobId} ${outcome.status}: ` +
          `${(outcome.failureReasons ?? ['no reason reported']).slice(0, 3).join(' | ')}`,
      );

    default:
      // STARTING / IN_PROGRESS.
      if (expired) {
        console.log(
          JSON.stringify({
            level: 'WARN',
            event: 'ingestion_still_running_at_deadline',
            jobId: outcome.ingestionJobId,
            indexed,
            failed,
            note: 'accepted; CloudFormation abandons a custom resource at 60 min regardless',
          }),
        );
        return {
          IsComplete: true,
          Data: { Statistics: JSON.stringify(outcome.statistics ?? {}), StillRunning: 'true' },
        };
      }
      return { IsComplete: false };
  }
};
