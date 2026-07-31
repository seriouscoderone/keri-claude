import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isAuroraWakeError,
  retryWhileWaking,
  AuroraWakeTimeout,
} from './aurora-wake';

/** Build an Error with a specific `name`, as the AWS SDK produces. */
function awsError(name: string, message: string): Error {
  const err = new Error(message);
  err.name = name;
  return err;
}

// Verbatim from CloudWatch, chat handler invocation dcbf53b1, 2026-07-31.
const productionWakeError = awsError(
  'ValidationException',
  'The vector database encountered an error while processing the request: ' +
    'The Aurora DB instance db-7RXOGRKA37S5FWCZVG2JMGFO4I is resuming after ' +
    'being auto-paused. Please wait a few seconds and try again. ' +
    '(Service: RdsData, Status Code: 400, Request ID: ' +
    '5575c2c5-1ecd-4708-87a1-ee02e23af7c2) (SDK Attempt Count: 1)',
);

beforeEach(() => {
  // retryWhileWaking emits structured JSON logs; keep test output readable.
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('isAuroraWakeError', () => {
  it('recognises the verbatim production error', () => {
    expect(isAuroraWakeError(productionWakeError)).toBe(true);
  });

  it.each([
    'The Aurora DB instance db-XYZ is resuming after being auto-paused.',
    'The DB cluster is paused. Please wait and try again.',
    'The cluster is being resumed. Retry shortly.',
    'Communications link failure during query',
    'The service is temporarily unavailable, retry later',
  ])('recognises wake wording: %s', (message) => {
    expect(isAuroraWakeError(awsError('ValidationException', message))).toBe(true);
  });

  it('recognises DatabaseResumingException by name, whatever the message', () => {
    expect(
      isAuroraWakeError(awsError('DatabaseResumingException', 'anything at all')),
    ).toBe(true);
  });

  // These two are the load-bearing assertions. If either flips, a configuration
  // typo becomes a silent 90-second hang instead of an immediate failure.
  it('does NOT match an unknown knowledge-base id', () => {
    expect(
      isAuroraWakeError(
        awsError(
          'ValidationException',
          'The knowledge base ABCD1234EF could not be found. ' +
            'Check the knowledge base id and try your request again.',
        ),
      ),
    ).toBe(false);
  });

  it('does NOT match an invalid model identifier', () => {
    expect(
      isAuroraWakeError(
        awsError(
          'ValidationException',
          'The provided model identifier is invalid.',
        ),
      ),
    ).toBe(false);
  });

  it.each(['AccessDeniedException', 'ThrottlingException', 'ResourceNotFoundException'])(
    'does not match unrelated exception %s',
    (name) => {
      expect(isAuroraWakeError(awsError(name, 'some unrelated failure'))).toBe(false);
    },
  );

  it.each([['a string', 'boom'], ['null', null], ['undefined', undefined]])(
    'returns false for non-Error value: %s',
    (_label, value) => {
      expect(isAuroraWakeError(value)).toBe(false);
    },
  );
});

describe('retryWhileWaking', () => {
  it('returns immediately on success, without sleeping or reporting', async () => {
    const op = vi.fn().mockResolvedValue('answer');
    const onWaking = vi.fn();

    const result = await retryWhileWaking(op, { timeoutMs: 90_000, onWaking });

    expect(result).toBe('answer');
    expect(op).toHaveBeenCalledTimes(1);
    expect(onWaking).not.toHaveBeenCalled();
  });

  it('retries past wake errors and reports each one', async () => {
    vi.useFakeTimers();
    const op = vi
      .fn()
      .mockRejectedValueOnce(productionWakeError)
      .mockRejectedValueOnce(productionWakeError)
      .mockResolvedValue('answer');
    const onWaking = vi.fn();

    const pending = retryWhileWaking(op, { timeoutMs: 90_000, onWaking });
    await vi.advanceTimersByTimeAsync(10_000);

    expect(await pending).toBe('answer');
    expect(op).toHaveBeenCalledTimes(3);
    expect(onWaking).toHaveBeenCalledTimes(2);
    // Reports (elapsedMs, attempt) — attempt is 1-based.
    expect(onWaking.mock.calls[0][1]).toBe(1);
    expect(onWaking.mock.calls[1][1]).toBe(2);
  });

  it('rethrows a non-wake error immediately, attempting the operation once', async () => {
    const configError = awsError(
      'ValidationException',
      'The provided model identifier is invalid.',
    );
    const op = vi.fn().mockRejectedValue(configError);

    await expect(
      retryWhileWaking(op, { timeoutMs: 90_000 }),
    ).rejects.toThrow('The provided model identifier is invalid.');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('throws AuroraWakeTimeout past the deadline, carrying attempts and elapsed', async () => {
    vi.useFakeTimers();
    const op = vi.fn().mockRejectedValue(productionWakeError);

    const settled = retryWhileWaking(op, { timeoutMs: 9_000 }).catch((e) => e);
    await vi.advanceTimersByTimeAsync(30_000);
    const err = (await settled) as AuroraWakeTimeout;

    expect(err).toBeInstanceOf(AuroraWakeTimeout);
    expect(err.name).toBe('AuroraWakeTimeout');
    expect(err.attempts).toBeGreaterThan(1);
    expect(err.elapsedMs).toBeGreaterThanOrEqual(9_000);
  });

  it('does not report a wake it is about to give up on', async () => {
    vi.useFakeTimers();
    const op = vi.fn().mockRejectedValue(productionWakeError);
    const onWaking = vi.fn();

    const settled = retryWhileWaking(op, { timeoutMs: 0, onWaking }).catch((e) => e);
    await vi.advanceTimersByTimeAsync(1_000);
    await settled;

    expect(onWaking).not.toHaveBeenCalled();
  });
});
