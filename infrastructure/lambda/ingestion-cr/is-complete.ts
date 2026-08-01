import { getLatestIngestion, startIngestion, type IngestionOutcome } from '../shared/ingestion';

/**
 * Polled by cr.Provider until it returns IsComplete: true, or throws.
 *
 * Throwing is the point: it is what turns a failed or partially failed
 * ingestion into a red deploy instead of a green one.
 *
 * Why this re-queries the latest job instead of the id on-event handed over:
 * a first-time ingestion of the full corpus outlives Aurora's 5-minute
 * auto-pause window, and Bedrock's *own* pipeline then fails individual files
 * with "is resuming after being auto-paused" — measured 3 of 64 on a fresh
 * stack (2026-08-01). Those files are fine; the vector store simply went to
 * sleep underneath the ingestion. The cure is another job, which Bedrock runs
 * incrementally over only what is missing. Tracking a new job id across polls
 * is impossible (the provider replays on-event's Data each time), so this reads
 * whichever job is newest and stays stateless.
 *
 * Convergence guard: a job that completes with failures but indexed nothing new
 * made no progress, so retrying it would loop until totalTimeout. That case
 * fails immediately instead.
 */
export const handler = async (event: {
  RequestType: 'Create' | 'Update' | 'Delete';
  Data?: { IngestionJobId?: string };
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

  console.log(
    JSON.stringify({
      level: 'INFO',
      event: 'ingestion_poll',
      jobId: outcome.ingestionJobId,
      status: outcome.status,
      indexed,
      failed,
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
        throw new Error(
          `Ingestion job ${outcome.ingestionJobId} completed with ${failed} failed ` +
            `document(s) and indexed nothing new, so retrying cannot help. ` +
            `Reasons: ${(outcome.failureReasons ?? ['none reported']).slice(0, 3).join(' | ')}`,
        );
      }

      // Progress was made — sweep up whatever the sleeping vector store dropped.
      const next = await startIngestion(knowledgeBaseId, dataSourceId);
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
      throw new Error(
        `Ingestion job ${outcome.ingestionJobId} ${outcome.status}: ` +
          `${(outcome.failureReasons ?? ['no reason reported']).slice(0, 3).join(' | ')}`,
      );

    default:
      // STARTING / IN_PROGRESS — let the provider poll again.
      return { IsComplete: false };
  }
};
