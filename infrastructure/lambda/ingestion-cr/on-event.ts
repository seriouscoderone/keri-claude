import { startIngestion } from '../shared/ingestion';

/**
 * CloudFormation custom-resource entry point for deploy-time ingestion.
 *
 * This replaced an AwsCustomResource calling Lambda.invoke, which reported
 * success whenever the *API call* succeeded — a handler error still counted as
 * a green deploy, so a broken ingestion was invisible. Under cr.Provider a
 * thrown error fails the resource, and the paired is-complete handler waits for
 * the job to finish rather than just starting it.
 */
export const handler = async (event: {
  RequestType: 'Create' | 'Update' | 'Delete';
  PhysicalResourceId?: string;
}) => {
  const knowledgeBaseId = process.env.KNOWLEDGE_BASE_ID!;
  const dataSourceId = process.env.DATA_SOURCE_ID!;
  const physicalResourceId = event.PhysicalResourceId ?? 'deploy-ingestion';

  // Nothing to undo: vectors live with the Knowledge Base, which the stack
  // deletes on its own.
  if (event.RequestType === 'Delete') {
    return { PhysicalResourceId: physicalResourceId, Data: {} };
  }

  const ingestionJobId = await startIngestion(knowledgeBaseId, dataSourceId);
  console.log(JSON.stringify({ level: 'INFO', event: 'ingestion_started', ingestionJobId }));

  return {
    PhysicalResourceId: physicalResourceId,
    Data: { IngestionJobId: ingestionJobId },
  };
};
