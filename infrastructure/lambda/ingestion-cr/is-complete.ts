import { getIngestion, assertIngestionHealthy } from '../shared/ingestion';

/**
 * Polled by cr.Provider until it returns IsComplete: true, or throws.
 *
 * Throwing here is the whole point: it is what turns a failed or partially
 * failed ingestion into a red deploy instead of a green one.
 */
export const handler = async (event: {
  RequestType: 'Create' | 'Update' | 'Delete';
  Data?: { IngestionJobId?: string };
}) => {
  if (event.RequestType === 'Delete') return { IsComplete: true };

  const ingestionJobId = event.Data?.IngestionJobId;
  if (!ingestionJobId) {
    throw new Error('is-complete invoked without an IngestionJobId from on-event');
  }

  const knowledgeBaseId = process.env.KNOWLEDGE_BASE_ID!;
  const dataSourceId = process.env.DATA_SOURCE_ID!;

  const outcome = await getIngestion(knowledgeBaseId, dataSourceId, ingestionJobId);
  console.log(JSON.stringify({ level: 'INFO', event: 'ingestion_poll', ingestionJobId, status: outcome.status }));

  switch (outcome.status) {
    case 'COMPLETE':
      // COMPLETE does not mean every document indexed.
      assertIngestionHealthy(outcome);
      console.log(
        JSON.stringify({
          level: 'INFO',
          event: 'ingestion_complete',
          ingestionJobId,
          statistics: outcome.statistics,
        }),
      );
      return { IsComplete: true, Data: { Statistics: JSON.stringify(outcome.statistics ?? {}) } };

    case 'FAILED':
    case 'STOPPED':
      throw new Error(
        `Ingestion job ${ingestionJobId} ${outcome.status}: ` +
          `${(outcome.failureReasons ?? ['no reason reported']).join('; ')}`,
      );

    default:
      // STARTING / IN_PROGRESS — let the provider poll again.
      return { IsComplete: false };
  }
};
