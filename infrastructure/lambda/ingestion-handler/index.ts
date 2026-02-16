import {
  BedrockAgentClient,
  StartIngestionJobCommand,
} from '@aws-sdk/client-bedrock-agent';

const client = new BedrockAgentClient({});

export const handler = async () => {
  const knowledgeBaseId = process.env.KNOWLEDGE_BASE_ID!;
  const dataSourceId = process.env.DATA_SOURCE_ID!;

  console.log('Starting ingestion job', { knowledgeBaseId, dataSourceId });

  const response = await client.send(
    new StartIngestionJobCommand({
      knowledgeBaseId,
      dataSourceId,
    }),
  );

  const ingestionJobId = response.ingestionJob?.ingestionJobId;
  console.log('Ingestion job started:', ingestionJobId);

  return { ingestionJobId };
};
