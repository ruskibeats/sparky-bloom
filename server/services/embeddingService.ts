import { log } from '../config/logging.js';

export interface OllamaEmbeddingConfig {
  baseUrl: string;
  model: string;
  dimension: number;
  timeoutMs: number;
  retries: number;
}

export interface OllamaEmbeddingRequest {
  input: string | string[];
  model: string;
}

export interface OllamaEmbeddingResponse {
  data: Array<{
    index: number;
    object: 'embedding';
    embedding: number[];
  }>;
  model: string;
  object: 'list';
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function loadOllamaEmbeddingConfig(): OllamaEmbeddingConfig {
  const baseUrl =
    process.env.OLLAMA_BASE_URL ??
    process.env.OLLAMA_HOST ??
    'http://192.168.0.245:11434';
  const model = process.env.OLLAMA_EMBEDDING_MODEL ?? 'nomic-embed-text';
  const dimension = Number(process.env.OLLAMA_EMBEDDING_DIMENSION ?? '768');
  const timeoutMs = Number(process.env.OLLAMA_EMBEDDING_TIMEOUT_MS ?? '60000');
  const retries = Number(process.env.OLLAMA_EMBEDDING_RETRIES ?? '3');

  if (!Number.isFinite(dimension) || dimension <= 0) {
    throw new Error('OLLAMA_EMBEDDING_DIMENSION must be a positive integer.');
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('OLLAMA_EMBEDDING_TIMEOUT_MS must be a positive integer.');
  }

  if (!Number.isFinite(retries) || retries < 0) {
    throw new Error('OLLAMA_EMBEDDING_RETRIES must be a non-negative integer.');
  }

  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    model,
    dimension,
    timeoutMs,
    retries,
  };
}

export async function embedTextWithOllama(
  text: string | string[],
  config: OllamaEmbeddingConfig = loadOllamaEmbeddingConfig()
): Promise<number[][]> {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const inputs = Array.isArray(text) ? text : [text];

  if (inputs.length === 0) {
    return [];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const requestBody: OllamaEmbeddingRequest = {
    input: inputs,
    model: config.model,
  };

  try {
    const response = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Ollama embeddings request failed: ${response.status} ${body}`
      );
    }

    const payload = (await response.json()) as OllamaEmbeddingResponse;
    const sortedEmbeddings = [...payload.data].sort(
      (left, right) => left.index - right.index
    );
    const embeddings = sortedEmbeddings.map((item) => item.embedding);

    if (embeddings.length !== inputs.length) {
      throw new Error(
        `Ollama returned ${embeddings.length} embeddings for ${inputs.length} inputs.`
      );
    }

    embeddings.forEach((embedding, index) => {
      if (embedding.length !== config.dimension) {
        throw new Error(
          `Ollama embedding dimension mismatch for input ${index}: expected ${config.dimension}, got ${embedding.length}.`
        );
      }
    });

    return embeddings;
  } finally {
    clearTimeout(timeout);
  }
}

export async function embedTextWithOllamaRetry(
  text: string | string[],
  config: OllamaEmbeddingConfig = loadOllamaEmbeddingConfig()
): Promise<number[][]> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.retries; attempt += 1) {
    try {
      return await embedTextWithOllama(text, config);
    } catch (error) {
      lastError = error;
      if (attempt < config.retries) {
        const backoffMs = 500 * 2 ** attempt;
        log(
          'warn',
          `[embeddingService] Ollama embedding attempt ${attempt + 1} failed; retrying in ${backoffMs}ms`,
          error
        );
        await delay(backoffMs);
      }
    }
  }

  throw lastError;
}

export function getOllamaEmbeddingDimension(): number {
  return loadOllamaEmbeddingConfig().dimension;
}

export async function embedSingleTextWithOllama(
  text: string,
  config?: OllamaEmbeddingConfig
): Promise<number[]> {
  const [embedding] = await embedTextWithOllamaRetry(text, config);
  return embedding;
}
