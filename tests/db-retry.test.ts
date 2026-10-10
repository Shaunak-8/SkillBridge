import { expect, it, vi } from 'vitest';
import { retryTransient } from '@/lib/db-retry';

const mock = () => vi.fn<(strings: TemplateStringsArray) => Promise<unknown>>();

it('retries connection failures and returns the eventual result', async () => {
  const sql = mock()
    .mockRejectedValueOnce(new Error('Error connecting to database: TypeError: fetch failed'))
    .mockRejectedValueOnce(Object.assign(new Error('boom'), { cause: new Error('UND_ERR_CONNECT_TIMEOUT') }))
    .mockResolvedValue([{ ok: true }]);
  await expect(retryTransient(sql)`SELECT 1`).resolves.toEqual([{ ok: true }]);
  expect(sql).toHaveBeenCalledTimes(3);
});

it('does not retry SQL errors', async () => {
  const sql = mock().mockRejectedValue(new Error('relation "x" does not exist'));
  await expect(retryTransient(sql)`SELECT 1`).rejects.toThrow('does not exist');
  expect(sql).toHaveBeenCalledTimes(1);
});

it('gives up after four attempts on a persistent connection failure', async () => {
  const sql = mock().mockRejectedValue(new Error('fetch failed'));
  await expect(retryTransient(sql)`SELECT 1`).rejects.toThrow('fetch failed');
  expect(sql).toHaveBeenCalledTimes(4);
}, 10000);
