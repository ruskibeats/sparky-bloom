import { describe, it, expect } from 'vitest';
import {
  T1DVectorSearchBodySchema,
  T1DVectorSearchResponseSchema,
  T1DVectorSearchResultSchema,
} from '../schemas/t1dNightscoutSchema.js';

describe('T1D vector search contract', () => {
  it('accepts a valid profile-scoped query and rejects invalid input', () => {
    // Valid: query only
    const validQueryOnly = T1DVectorSearchBodySchema.safeParse({
      query: 'overnight glucose stability',
    });
    expect(validQueryOnly.success).toBe(true);
    if (validQueryOnly.success) {
      expect(validQueryOnly.data.query).toBe('overnight glucose stability');
      expect(validQueryOnly.data.limit).toBe(5); // default
      expect(validQueryOnly.data.embedding).toBeUndefined();
    }

    // Valid: query + embedding + limit
    const validFull = T1DVectorSearchBodySchema.safeParse({
      query: 'glucose pattern',
      embedding: Array(768).fill(0.01),
      limit: 10,
    });
    expect(validFull.success).toBe(true);
    if (validFull.success) {
      expect(validFull.data.embedding).toHaveLength(768);
      expect(validFull.data.limit).toBe(10);
    }

    // Invalid: missing query
    const missingQuery = T1DVectorSearchBodySchema.safeParse({
      limit: 5,
    });
    expect(missingQuery.success).toBe(false);

    // Invalid: empty query
    const emptyQuery = T1DVectorSearchBodySchema.safeParse({
      query: '',
    });
    expect(emptyQuery.success).toBe(false);

    // Invalid: embedding wrong dimension
    const wrongDim = T1DVectorSearchBodySchema.safeParse({
      query: 'test',
      embedding: [0.1, 0.2, 0.3], // 3 dims, expected 768
    });
    expect(wrongDim.success).toBe(false);
    if (!wrongDim.success) {
      const issue = wrongDim.error.issues.find((i) =>
        String(i.message).includes('dimension')
      );
      expect(issue).toBeDefined();
    }

    // Invalid: limit too high
    const limitTooHigh = T1DVectorSearchBodySchema.safeParse({
      query: 'test',
      limit: 100,
    });
    expect(limitTooHigh.success).toBe(false);

    // Invalid: limit too low
    const limitTooLow = T1DVectorSearchBodySchema.safeParse({
      query: 'test',
      limit: 0,
    });
    expect(limitTooLow.success).toBe(false);

    // Invalid: wrong types
    const wrongTypes = T1DVectorSearchBodySchema.safeParse({
      query: 123,
      limit: 'five',
    });
    expect(wrongTypes.success).toBe(false);
  });

  it('validates response shape with profile ownership', () => {
    // Valid response
    const validResponse = T1DVectorSearchResponseSchema.safeParse({
      profileId: '550e8400-e29b-41d4-a716-446655440000',
      results: [
        {
          id: '660e8400-e29b-41d4-a716-446655440001',
          t1d_profile_id: '550e8400-e29b-41d4-a716-446655440000',
          domain: 'legend',
          source_type: 'profile_summary',
          source_id: null,
          title: 'Test legend profile',
          content_text: 'Some content about glucose patterns.',
          metadata_json: { key: 'value' },
          embedding: null,
          similarity: 0.95,
        },
      ],
    });
    expect(validResponse.success).toBe(true);
    if (validResponse.success) {
      expect(validResponse.data.profileId).toBe(
        '550e8400-e29b-41d4-a716-446655440000'
      );
      expect(validResponse.data.results).toHaveLength(1);
      expect(validResponse.data.results[0].t1d_profile_id).toBe(
        validResponse.data.profileId
      );
    }

    // Invalid: missing profileId
    const missingProfileId = T1DVectorSearchResponseSchema.safeParse({
      results: [],
    });
    expect(missingProfileId.success).toBe(false);

    // Invalid: missing results
    const missingResults = T1DVectorSearchResponseSchema.safeParse({
      profileId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(missingResults.success).toBe(false);

    // Valid: empty results array
    const emptyResults = T1DVectorSearchResponseSchema.safeParse({
      profileId: '550e8400-e29b-41d4-a716-446655440000',
      results: [],
    });
    expect(emptyResults.success).toBe(true);
  });

  it('validates individual result shape', () => {
    // Valid minimal result
    const validResult = T1DVectorSearchResultSchema.safeParse({
      id: '660e8400-e29b-41d4-a716-446655440001',
      t1d_profile_id: '550e8400-e29b-41d4-a716-446655440000',
      domain: 'legend',
      source_type: 'profile_summary',
      content_text: 'Test content',
    });
    expect(validResult.success).toBe(true);

    // Invalid: missing required field
    const missingContent = T1DVectorSearchResultSchema.safeParse({
      id: '660e8400-e29b-41d4-a716-446655440001',
      t1d_profile_id: '550e8400-e29b-41d4-a716-446655440000',
      domain: 'legend',
      source_type: 'profile_summary',
    });
    expect(missingContent.success).toBe(false);
  });
});
