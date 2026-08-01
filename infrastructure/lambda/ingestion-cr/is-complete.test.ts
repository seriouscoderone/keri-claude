import { describe, it, expect, vi, beforeEach } from 'vitest';

const getIngestion = vi.fn();
vi.mock('../shared/ingestion', async () => {
  const actual = await vi.importActual<typeof import('../shared/ingestion')>('../shared/ingestion');
  return { ...actual, getIngestion };
});

// Imported after the mock so the handler picks it up.
const { handler } = await import('./is-complete');

const EVENT = {
  RequestType: 'Update' as const,
  Data: { IngestionJobId: 'JOB123' },
};

beforeEach(() => {
  process.env.KNOWLEDGE_BASE_ID = 'KB1';
  process.env.DATA_SOURCE_ID = 'DS1';
  getIngestion.mockReset();
});

describe('deploy-time ingestion completion', () => {
  it('keeps polling while the job is in progress', async () => {
    getIngestion.mockResolvedValue({ status: 'IN_PROGRESS' });
    await expect(handler(EVENT)).resolves.toEqual({ IsComplete: false });
  });

  it('keeps polling while the job is starting', async () => {
    getIngestion.mockResolvedValue({ status: 'STARTING' });
    await expect(handler(EVENT)).resolves.toEqual({ IsComplete: false });
  });

  it('completes when the job is COMPLETE with no failed documents', async () => {
    getIngestion.mockResolvedValue({
      status: 'COMPLETE',
      statistics: { numberOfDocumentsScanned: 64, numberOfDocumentsFailed: 0 },
    });
    const res = await handler(EVENT);
    expect(res.IsComplete).toBe(true);
  });

  // The regression this whole change exists for: a green deploy must not be
  // possible when ingestion did not actually succeed.
  it('FAILS the deploy when the job FAILED', async () => {
    getIngestion.mockResolvedValue({
      status: 'FAILED',
      failureReasons: ['vector store unavailable'],
    });
    await expect(handler(EVENT)).rejects.toThrow(/FAILED.*vector store unavailable/s);
  });

  it('FAILS the deploy when the job was STOPPED', async () => {
    getIngestion.mockResolvedValue({ status: 'STOPPED' });
    await expect(handler(EVENT)).rejects.toThrow(/STOPPED/);
  });

  it('FAILS the deploy on a COMPLETE job that silently dropped documents', async () => {
    getIngestion.mockResolvedValue({
      status: 'COMPLETE',
      statistics: { numberOfDocumentsScanned: 64, numberOfDocumentsFailed: 3 },
    });
    await expect(handler(EVENT)).rejects.toThrow(/3 document\(s\) failed to index/);
  });

  it('is a no-op on Delete', async () => {
    await expect(handler({ RequestType: 'Delete' })).resolves.toEqual({ IsComplete: true });
    expect(getIngestion).not.toHaveBeenCalled();
  });

  it('fails loudly if on-event did not hand over a job id', async () => {
    await expect(handler({ RequestType: 'Create', Data: {} })).rejects.toThrow(/without an IngestionJobId/);
  });
});
