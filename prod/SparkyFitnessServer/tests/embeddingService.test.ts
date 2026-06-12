import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  embedTextWithOllama,
  embedTextWithOllamaRetry,
  loadOllamaEmbeddingConfig,
} from '../services/embeddingService.js';

const okResponse = (payload: unknown) =>
  ({
    ok: true,
    status: 200,
    text: vi.fn().mockResolvedValue(JSON.stringify(payload)),
    json: vi.fn().mockResolvedValue(payload),
  }) as unknown as Response;

describe('embeddingService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads local Ollama embedding config for nomic-embed-text', () => {
    const config = loadOllamaEmbeddingConfig();

    expect(config.baseUrl).toBe('http://192.168.0.245:11434');
    expect(config.model).toBe('nomic-embed-text');
    expect(config.dimension).toBe(768);
  });

  it('posts text to the Ollama OpenAI-compatible embeddings endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okResponse({
        object: 'list',
        model: 'nomic-embed-text',
        data: [
          {
            index: 1,
            object: 'embedding',
            embedding: [0.2, 0.4, 0.6, 0.8],
          },
          {
            index: 0,
            object: 'embedding',
            embedding: [0.1, 0.3, 0.5, 0.7],
          },
        ],
      })
    );

    const result = await embedTextWithOllama(['first chunk', 'second chunk'], {
      baseUrl: 'http://192.168.0.245:11434/',
      model: 'nomic-embed-text',
      dimension: 4,
      timeoutMs: 1000,
      retries: 0,
    });

    expect(result).toEqual([
      [0.1, 0.3, 0.5, 0.7],
      [0.2, 0.4, 0.6, 0.8],
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://192.168.0.245:11434/v1/embeddings',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );
  });

  it('rejects embeddings that do not match the configured dimension', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      okResponse({
        object: 'list',
        model: 'nomic-embed-text',
        data: [
          {
            index: 0,
            object: 'embedding',
            embedding: [0.1, 0.2],
          },
        ],
      })
    );

    await expect(
      embedTextWithOllama('short vector', {
        baseUrl: 'http://192.168.0.245:11434',
        model: 'nomic-embed-text',
        dimension: 4,
        timeoutMs: 1000,
        retries: 0,
      })
    ).rejects.toThrow('expected 4, got 2');
  });

  it('retries transient Ollama embedding failures', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce(
        okResponse({
          object: 'list',
          model: 'nomic-embed-text',
          data: [
            {
              index: 0,
              object: 'embedding',
              embedding: [0.1, 0.2, 0.3, 0.4],
            },
          ],
        })
      );

    const result = await embedTextWithOllamaRetry('retry me', {
      baseUrl: 'http://192.168.0.245:11434',
      model: 'nomic-embed-text',
      dimension: 4,
      timeoutMs: 1000,
      retries: 1,
    });

    expect(result).toEqual([[0.1, 0.2, 0.3, 0.4]]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
