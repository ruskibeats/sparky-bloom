import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resolveEnvWithAlias,
  getEnvCompatConfig,
  getCookieNamesForSignOut,
} from '../services/envCookieCompat.js';

describe('envCookieCompat', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('resolveEnvWithAlias', () => {
    it('prefers new BLOOM_ var over old SPARKY_FITNESS_ var', () => {
      process.env.BLOOM_FRONTEND_URL = 'https://bloom.example.com';
      process.env.SPARKY_FITNESS_FRONTEND_URL = 'https://sparky.example.com';

      const result = resolveEnvWithAlias(
        'BLOOM_FRONTEND_URL',
        'SPARKY_FITNESS_FRONTEND_URL'
      );

      expect(result).toBe('https://bloom.example.com');
    });

    it('falls back to old SPARKY_FITNESS_ var when new BLOOM_ var is unset', () => {
      delete process.env.BLOOM_FRONTEND_URL;
      process.env.SPARKY_FITNESS_FRONTEND_URL = 'https://sparky.example.com';

      const result = resolveEnvWithAlias(
        'BLOOM_FRONTEND_URL',
        'SPARKY_FITNESS_FRONTEND_URL'
      );

      expect(result).toBe('https://sparky.example.com');
    });

    it('returns undefined when neither new nor old var is set', () => {
      delete process.env.BLOOM_FRONTEND_URL;
      delete process.env.SPARKY_FITNESS_FRONTEND_URL;

      const result = resolveEnvWithAlias(
        'BLOOM_FRONTEND_URL',
        'SPARKY_FITNESS_FRONTEND_URL'
      );

      expect(result).toBeUndefined();
    });
  });

  describe('getEnvCompatConfig', () => {
    it('loads config with new vars taking precedence over old vars', () => {
      process.env.BLOOM_FRONTEND_URL = 'https://bloom.example.com';
      process.env.BETTER_AUTH_SECRET = 'secret123';
      process.env.BLOOM_COOKIE_PREFIX = 'bloom';
      delete process.env.SPARKY_FITNESS_FRONTEND_URL;

      const config = getEnvCompatConfig();

      expect(config.frontendUrl).toBe('https://bloom.example.com');
      expect(config.cookiePrefix).toBe('bloom');
    });

    it('falls back to old vars when new vars are not set', () => {
      delete process.env.BLOOM_FRONTEND_URL;
      delete process.env.BLOOM_COOKIE_PREFIX;
      process.env.SPARKY_FITNESS_FRONTEND_URL = 'https://sparky.example.com';

      const config = getEnvCompatConfig();

      expect(config.frontendUrl).toBe('https://sparky.example.com');
      expect(config.cookiePrefix).toBe('sparky');
    });
  });

  describe('getCookieNamesForSignOut', () => {
    it('returns both old and new cookie names for sign-out cleanup', () => {
      const cookies = getCookieNamesForSignOut('sparky', 'bloom');

      expect(cookies).toContain('sparky.session_token');
      expect(cookies).toContain('bloom.session_token');
      expect(cookies).toContain('sparky_active_user_id');
      expect(cookies).toContain('bloom_active_user_id');
    });

    it('returns new-only cookie names when no old prefix is set', () => {
      const cookies = getCookieNamesForSignOut(undefined, 'bloom');

      expect(cookies).toContain('bloom.session_token');
      expect(cookies).toContain('bloom_active_user_id');
      expect(cookies).not.toContain('sparky.session_token');
    });
  });
});
