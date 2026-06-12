import t1dVectorDocumentRepository, {
  T1DVectorDocumentInput,
} from '../models/t1dVectorDocumentRepository.js';
import {
  embedSingleTextWithOllama,
  loadOllamaEmbeddingConfig,
} from './embeddingService.js';

export interface T1DEmbeddingConfig {
  dimension: number;
}

export async function embedT1DText(
  contentText: string
): Promise<{ embedding: number[]; dimension: number }> {
  const config = loadOllamaEmbeddingConfig();
  const embedding = await embedSingleTextWithOllama(contentText, config);

  return {
    embedding,
    dimension: config.dimension,
  };
}

export async function upsertT1DVectorDocument(
  profileId: string,
  actingUserId: string,
  document: T1DVectorDocumentInput,
  options: { skipEmbedding?: boolean } = {}
) {
  if (!options.skipEmbedding && document.embedding === undefined) {
    const { embedding, dimension } = await embedT1DText(document.contentText);

    return t1dVectorDocumentRepository.upsertVectorDocument(
      profileId,
      actingUserId,
      {
        ...document,
        embedding,
        metadataJson: {
          ...(document.metadataJson ?? {}),
          embedding_model: loadOllamaEmbeddingConfig().model,
          embedding_dimension: dimension,
        },
      }
    );
  }

  return t1dVectorDocumentRepository.upsertVectorDocument(
    profileId,
    actingUserId,
    document
  );
}
