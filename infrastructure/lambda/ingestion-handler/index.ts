import {
  BedrockAgentClient,
  StartIngestionJobCommand,
} from '@aws-sdk/client-bedrock-agent';
import { retryWhileWaking } from '../shared/aurora-wake';

const client = new BedrockAgentClient({});

/**
 * StartIngestionJob is rejected outright while Aurora is resuming from its
 * auto-pause, so it needs the same wake retry the chat path uses.
 *
 * The daily EventBridge schedule masked this: asynchronous invocations are
 * retried twice by AWS, so a first attempt landing on a paused cluster
 * self-healed. CloudFormation's deploy-time custom resource gets no such
 * retry — it fails the whole stack update. Putting the retry here fixes both
 * callers rather than only the one that surfaced the problem.
 */
export const handler = async () => {
  const knowledgeBaseId = process.env.KNOWLEDGE_BASE_ID!;
  const dataSourceId = process.env.DATA_SOURCE_ID!;

  console.log('Starting ingestion job', { knowledgeBaseId, dataSourceId });

  const response = await retryWhileWaking(
    () =>
      client.send(
        new StartIngestionJobCommand({
          knowledgeBaseId,
          dataSourceId,
        }),
      ),
    {
      // A resume measured ~25s; allow generous headroom while staying inside
      // the Lambda timeout so a genuine failure still reports as one.
      timeoutMs: 120_000,
      onWaking: (elapsedMs, attempt) =>
        console.log(
          JSON.stringify({
            level: 'WARN',
            event: 'ingestion_waiting_for_aurora',
            attempt,
            elapsed_ms: elapsedMs,
          }),
        ),
    },
  );

  const ingestionJobId = response.ingestionJob?.ingestionJobId;
  console.log('Ingestion job started:', ingestionJobId);

  return { ingestionJobId };
};
