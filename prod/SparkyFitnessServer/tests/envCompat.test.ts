import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { getEnvWithCompat } from '../config/envCompat.js';

describe('envCompat', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    // Clear any env vars we might set during tests
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('SPARKY_FITNESS_') || key.startsWith('BLOOM_')) {
        delete process.env[key];
      }
    }
  });

  afterEach(() => {
    // Restore original env
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('SPARKY_FITNESS_') || key.startsWith('BLOOM_')) {
        delete process.env[key];
      }
    }
    for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
      process.env[key] = value;
    }
  });

  describe('getEnvWithCompat', () => {
    it('returns old SPARKY_FITNESS_ value when only old var is set', () => {
      process.env.SPARKY_FITNESS_DB_HOST = 'old-host';
      const result = getEnvWithCompat('SPARKY_FITNESS_DB_HOST', 'BLOOM_DB_HOST');
      expect(result).toBe('old-host');
    });

    it('returns new BLOOM_ value when only new var is set', () => {
      process.env.BLOOM_DB_HOST = 'new-host';
      const result = getEnvWithCompat('SPARKY_FITNESS_DB_HOST', 'BLOOM_DB_HOST');
      expect(result).toBe('new-host');
    });

    it('prefers old SPARKY_FITNESS_ over new BLOOM_ when both are set', () => {
      process.env.SPARKY_FITNESS_DB_HOST = 'old-host';
      process.env.BLOOM_DB_HOST = 'new-host';
      const result = getEnvWithCompat('SPARKY_FITNESS_DB_HOST', 'BLOOM_DB_HOST');
      expect(result).toBe('old-host');
    });

    it('returns undefined when neither old nor new var is set', () => {
      const result = getEnvWithCompat('SPARKY_FITNESS_DB_HOST', 'BLOOM_DB_HOST');
      expect(result).toBeUndefined();
    });

    it('returns default value when neither old nor new var is set and default provided', () => {
      const result = getEnvWithCompat('SPARKY_FITNESS_DB_HOST', 'BLOOM_DB_HOST', 'localhost');
      expect(result).toBe('localhost');
    });
  });
});
