import {
  BedrockAgentClient,
  StartIngestionJobCommand,
  GetIngestionJobCommand,
  ListIngestionJobsCommand,
  type IngestionJobStatistics,
} from '@aws-sdk/client-bedrock-agent';
import { isAuroraWakeError, WAKE_RETRY_INTERVAL_MS } from './aurora-wake';

const client = new BedrockAgentClient({});

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Bedrock permits one active ingestion job per data source, so a second start
 * while one is running is rejected. Deploy-time and scheduled ingestion can
 * overlap, so treat this as retryable rather than fatal.
 */
export function isIngestionConflictError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const name = (err as { name?: string }).name ?? '';
  if (name === 'ConflictException') return true;
  const m = err.message.toLowerCase();
  return m.includes('ongoing ingestion job') || m.includes('already in progress');
}

/**
 * Start an ingestion job, tolerating the two transient conditions that make an
 * otherwise-healthy call fail: Aurora resuming from auto-pause, and another job
 * still active.
 */
export async function startIngestion(
  knowledgeBaseId: string,
  dataSourceId: string,
  opts: { timeoutMs?: number } = {},
): Promise<string> {
  const deadline = Date.now() + (opts.timeoutMs ?? 120_000);
  let attempt = 0;

  for (;;) {
    try {
      const res = await client.send(
        new StartIngestionJobCommand({ knowledgeBaseId, dataSourceId }),
      );
      const id = res.ingestionJob?.ingestionJobId;
      if (!id) throw new Error('StartIngestionJob returned no ingestionJobId');
      return id;
    } catch (err) {
      const retryable = isAuroraWakeError(err) || isIngestionConflictError(err);
      if (!retryable || Date.now() >= deadline) throw err;

      attempt += 1;
      console.log(
        JSON.stringify({
          level: 'WARN',
          event: isAuroraWakeError(err) ? 'ingestion_waiting_for_aurora' : 'ingestion_job_conflict',
          attempt,
          error_snippet: (err as Error).message.slice(0, 120),
        }),
      );
      await sleep(WAKE_RETRY_INTERVAL_MS);
    }
  }
}

export type IngestionOutcome = {
  ingestionJobId?: string;
  status: string;
  statistics?: IngestionJobStatistics;
  failureReasons?: string[];
};

export async function getIngestion(
  knowledgeBaseId: string,
  dataSourceId: string,
  ingestionJobId: string,
): Promise<IngestionOutcome> {
  const res = await client.send(
    new GetIngestionJobCommand({ knowledgeBaseId, dataSourceId, ingestionJobId }),
  );
  return {
    ingestionJobId: res.ingestionJob?.ingestionJobId,
    status: res.ingestionJob?.status ?? 'UNKNOWN',
    statistics: res.ingestionJob?.statistics,
    failureReasons: res.ingestionJob?.failureReasons,
  };
}

/**
 * A job can end COMPLETE having failed to index individual documents. Silent
 * partial failure is exactly what this whole pipeline is meant to avoid, so
 * treat any failed document as a failure of the deploy.
 */
export function assertIngestionHealthy(outcome: IngestionOutcome): void {
  const failed = outcome.statistics?.numberOfDocumentsFailed ?? 0;
  if (failed > 0) {
    throw new Error(
      `Ingestion completed but ${failed} document(s) failed to index. ` +
        `Statistics: ${JSON.stringify(outcome.statistics)}`,
    );
  }
}

/**
 * The most recently started job for this data source. Used instead of a
 * remembered job id because the custom-resource provider replays on-event's
 * output on every poll, so a retry job id cannot be threaded through.
 */
export async function getLatestIngestion(
  knowledgeBaseId: string,
  dataSourceId: string,
): Promise<IngestionOutcome | undefined> {
  const res = await client.send(
    new ListIngestionJobsCommand({
      knowledgeBaseId,
      dataSourceId,
      maxResults: 1,
      sortBy: { attribute: 'STARTED_AT', order: 'DESCENDING' },
    }),
  );
  const summary = res.ingestionJobSummaries?.[0];
  if (!summary?.ingestionJobId) return undefined;
  return getIngestion(knowledgeBaseId, dataSourceId, summary.ingestionJobId);
}
