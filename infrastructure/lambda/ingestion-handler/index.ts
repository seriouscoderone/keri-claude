import { startIngestion } from '../shared/ingestion';

/**
 * Daily EventBridge entry point.
 *
 * The retry logic lives in shared/ingestion.ts so this and the deploy-time
 * custom resource cannot drift apart — the original bug was that only the chat
 * path had Aurora wake handling, and the ingestion path silently relied on
 * EventBridge's two free async retries to paper over it.
 *
 * This path deliberately does not wait for the job to finish: nothing consumes
 * the result, and holding a Lambda open for the duration would only add cost.
 * The deploy-time path waits, because there a failure must fail the deploy.
 */
export const handler = async () => {
  const knowledgeBaseId = process.env.KNOWLEDGE_BASE_ID!;
  const dataSourceId = process.env.DATA_SOURCE_ID!;

  console.log('Starting ingestion job', { knowledgeBaseId, dataSourceId });

  const ingestionJobId = await startIngestion(knowledgeBaseId, dataSourceId);

  console.log('Ingestion job started:', ingestionJobId);
  return { ingestionJobId };
};
