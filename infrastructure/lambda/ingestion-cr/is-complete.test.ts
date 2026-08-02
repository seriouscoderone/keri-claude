import { describe, it, expect, vi, beforeEach } from 'vitest';

const getLatestIngestion = vi.fn();
const startIngestion = vi.fn();
vi.mock('../shared/ingestion', async () => {
  const actual = await vi.importActual<typeof import('../shared/ingestion')>('../shared/ingestion');
  return { ...actual, getLatestIngestion, startIngestion };
});

const { handler } = await import('./is-complete');

const FUTURE = String(Date.now() + 10 * 60 * 1000);   // budget still open
const PAST   = String(Date.now() - 60 * 1000);        // budget expired

const EVENT  = { RequestType: 'Update' as const, Data: { IngestionJobId: 'JOB123', Deadline: FUTURE } };
const LATE   = { RequestType: 'Update' as const, Data: { IngestionJobId: 'JOB123', Deadline: PAST } };

const outcome = (over: Record<string, unknown> = {}) => ({
  ingestionJobId: 'JOB123',
  status: 'COMPLETE',
  statistics: {
    numberOfDocumentsScanned: 64,
    numberOfNewDocumentsIndexed: 64,
    numberOfModifiedDocumentsIndexed: 0,
    numberOfDocumentsFailed: 0,
  },
  ...over,
});

beforeEach(() => {
  process.env.KNOWLEDGE_BASE_ID = 'KB1';
  process.env.DATA_SOURCE_ID = 'DS1';
  getLatestIngestion.mockReset();
  startIngestion.mockReset();
  startIngestion.mockResolvedValue('JOB124');
});

describe('deploy-time ingestion completion', () => {
  it('keeps polling while in progress', async () => {
    getLatestIngestion.mockResolvedValue(outcome({ status: 'IN_PROGRESS' }));
    await expect(handler(EVENT)).resolves.toEqual({ IsComplete: false });
    expect(startIngestion).not.toHaveBeenCalled();
  });

  it('completes on a clean COMPLETE', async () => {
    getLatestIngestion.mockResolvedValue(outcome());
    const res = await handler(EVENT);
    expect(res.IsComplete).toBe(true);
    expect(startIngestion).not.toHaveBeenCalled();
  });

  it('FAILS the deploy when the job FAILED', async () => {
    getLatestIngestion.mockResolvedValue(
      outcome({ status: 'FAILED', failureReasons: ['vector store unavailable'] }),
    );
    await expect(handler(EVENT)).rejects.toThrow(/FAILED.*vector store unavailable/s);
  });

  it('FAILS the deploy when the job was STOPPED', async () => {
    getLatestIngestion.mockResolvedValue(outcome({ status: 'STOPPED' }));
    await expect(handler(EVENT)).rejects.toThrow(/STOPPED/);
  });

  // Aurora auto-pausing mid-ingestion fails individual files that are fine.
  // Another job sweeps them up, so long as progress is still being made.
  it('retries when a COMPLETE job made progress but dropped some documents', async () => {
    getLatestIngestion.mockResolvedValue(
      outcome({
        statistics: {
          numberOfDocumentsScanned: 64,
          numberOfNewDocumentsIndexed: 37,
          numberOfModifiedDocumentsIndexed: 0,
          numberOfDocumentsFailed: 3,
        },
      }),
    );
    await expect(handler(EVENT)).resolves.toEqual({ IsComplete: false });
    expect(startIngestion).toHaveBeenCalledWith('KB1', 'DS1', { timeoutMs: 20_000 });
  });

  // Convergence guard: retrying a job that indexed nothing would loop until
  // totalTimeout, so fail immediately instead.
  it('FAILS rather than looping when a COMPLETE job made no progress', async () => {
    getLatestIngestion.mockResolvedValue(
      outcome({
        statistics: {
          numberOfDocumentsScanned: 64,
          numberOfNewDocumentsIndexed: 0,
          numberOfModifiedDocumentsIndexed: 0,
          numberOfDocumentsFailed: 3,
        },
        failureReasons: ['unparseable file'],
      }),
    );
    await expect(handler(EVENT)).rejects.toThrow(/indexed nothing new/);
    expect(startIngestion).not.toHaveBeenCalled();
  });

  it('counts modified documents as progress', async () => {
    getLatestIngestion.mockResolvedValue(
      outcome({
        statistics: {
          numberOfDocumentsScanned: 64,
          numberOfNewDocumentsIndexed: 0,
          numberOfModifiedDocumentsIndexed: 5,
          numberOfDocumentsFailed: 1,
        },
      }),
    );
    await expect(handler(EVENT)).resolves.toEqual({ IsComplete: false });
    expect(startIngestion).toHaveBeenCalled();
  });

  // A start that cannot happen right now must not blow up the poll: the Lambda
  // dying mid-call sends CloudFormation nothing and fails the whole stack.
  it('defers rather than throwing when the retry start fails', async () => {
    getLatestIngestion.mockResolvedValue(
      outcome({
        statistics: {
          numberOfDocumentsScanned: 64,
          numberOfNewDocumentsIndexed: 37,
          numberOfModifiedDocumentsIndexed: 0,
          numberOfDocumentsFailed: 3,
        },
      }),
    );
    startIngestion.mockRejectedValue(new Error('ConflictException: ongoing ingestion job'));
    await expect(handler(EVENT)).resolves.toEqual({ IsComplete: false });
  });

  // CloudFormation abandons a custom resource at 60 minutes regardless, so a
  // still-healthy job past our budget must be accepted, not failed.
  it('accepts a still-running job once the budget expires', async () => {
    getLatestIngestion.mockResolvedValue(outcome({ status: 'IN_PROGRESS' }));
    const res = await handler(LATE);
    expect(res.IsComplete).toBe(true);
    expect(res.Data?.StillRunning).toBe('true');
  });

  it('accepts a partially-failed job once the budget expires, without retrying', async () => {
    getLatestIngestion.mockResolvedValue(
      outcome({
        statistics: {
          numberOfDocumentsScanned: 64,
          numberOfNewDocumentsIndexed: 58,
          numberOfModifiedDocumentsIndexed: 0,
          numberOfDocumentsFailed: 6,
        },
      }),
    );
    const res = await handler(LATE);
    expect(res.IsComplete).toBe(true);
    expect(res.Data?.IncompleteAtDeadline).toBe('true');
    expect(startIngestion).not.toHaveBeenCalled();
  });

  // Breakage still fails, budget or no budget — otherwise the deadline would
  // become a way to launder real failures into green deploys.
  it('FAILS an expired job that actually FAILED', async () => {
    getLatestIngestion.mockResolvedValue(outcome({ status: 'FAILED', failureReasons: ['boom'] }));
    await expect(handler(LATE)).rejects.toThrow(/FAILED.*boom/s);
  });

  it('FAILS an expired job that made no progress', async () => {
    getLatestIngestion.mockResolvedValue(
      outcome({
        statistics: {
          numberOfDocumentsScanned: 64,
          numberOfNewDocumentsIndexed: 0,
          numberOfModifiedDocumentsIndexed: 0,
          numberOfDocumentsFailed: 3,
        },
      }),
    );
    await expect(handler(LATE)).rejects.toThrow(/indexed nothing new/);
  });

  it('is a no-op on Delete', async () => {
    await expect(handler({ RequestType: 'Delete' })).resolves.toEqual({ IsComplete: true });
    expect(getLatestIngestion).not.toHaveBeenCalled();
  });

  it('fails loudly when no job exists at all', async () => {
    getLatestIngestion.mockResolvedValue(undefined);
    await expect(handler(EVENT)).rejects.toThrow(/No ingestion job found/);
  });
});
