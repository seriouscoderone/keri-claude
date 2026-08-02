import { startIngestion } from '../shared/ingestion';

/**
 * How long the deploy is willing to wait for ingestion before accepting a
 * still-healthy job and moving on.
 *
 * CloudFormation abandons any custom resource that has not responded within
 * ONE HOUR, and that ceiling is not configurable. Measured 2026-08-02: a fresh
 * stack failed at exactly 60.4 minutes with the isComplete handler still
 * polling happily. Anything at or above 60 minutes is therefore unreachable —
 * a totalTimeout of 2h was never achievable, it just looked like one.
 *
 * A first-time ingestion of the full corpus takes 45-90 minutes, so waiting for
 * completion is a coin flip against that ceiling. Production's incremental
 * ingestion takes ~2 minutes and always finishes well inside it.
 */
export const WAIT_BUDGET_MS = 45 * 60 * 1000;

/**
 * CloudFormation custom-resource entry point for deploy-time ingestion.
 *
 * Starts the job and hands the completion handler a wall-clock deadline. The
 * deadline has to travel through Data because the provider framework replays
 * this response on every poll and the completion handler is otherwise
 * stateless — it has no way to know how long the resource has been running.
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
  const deadline = Date.now() + WAIT_BUDGET_MS;

  console.log(
    JSON.stringify({
      level: 'INFO',
      event: 'ingestion_started',
      ingestionJobId,
      waitBudgetMinutes: WAIT_BUDGET_MS / 60000,
      deadlineIso: new Date(deadline).toISOString(),
    }),
  );

  return {
    PhysicalResourceId: physicalResourceId,
    Data: { IngestionJobId: ingestionJobId, Deadline: String(deadline) },
  };
};
