/**
 * Env var compatibility layer for SparkyFitness → Bloom/T1D transition.
 *
 * During the transition period, both old (SPARKY_FITNESS_*) and new (BLOOM_*)
 * env vars are supported. Old vars take precedence when both are set, ensuring
 * backward compatibility for existing deployments.
 *
 * Once the transition is complete, callers can migrate to using only the
 * new BLOOM_* names and this compat layer becomes a no-op.
 */

/**
 * Resolve an environment variable value checking both old and new names.
 *
 * @param oldName - The legacy SPARKY_FITNESS_* env var name
 * @param newName - The new BLOOM_* env var name
 * @param defaultValue - Optional fallback when neither is set
 * @returns The resolved value, or defaultValue if neither is set
 */
export function getEnvWithCompat(
  oldName: string,
  newName: string,
  defaultValue?: string
): string | undefined {
  const oldValue = process.env[oldName];
  if (oldValue !== undefined && oldValue !== '') {
    return oldValue;
  }
  const newValue = process.env[newName];
  if (newValue !== undefined && newValue !== '') {
    return newValue;
  }
  return defaultValue;
}

/**
 * Get a boolean env var with compatibility for both old and new names.
 * Old var takes precedence when both are set.
 */
export function getBooleanEnvWithCompat(
  oldName: string,
  newName: string,
  defaultValue = false
): boolean {
  const value = getEnvWithCompat(oldName, newName);
  if (value === undefined) {
    return defaultValue;
  }
  return value === 'true' || value === '1';
}

/**
 * Mapping of all SPARKY_FITNESS_* env vars to their BLOOM_* aliases.
 * Add new mappings here as the transition progresses.
 */
export const ENV_VAR_MAPPINGS: ReadonlyArray<{
  oldName: string;
  newName: string;
  defaultValue?: string;
}> = [
  { oldName: 'SPARKY_FITNESS_DB_HOST', newName: 'BLOOM_DB_HOST' },
  { oldName: 'SPARKY_FITNESS_DB_PORT', newName: 'BLOOM_DB_PORT', defaultValue: '5432' },
  { oldName: 'SPARKY_FITNESS_DB_NAME', newName: 'BLOOM_DB_NAME' },
  { oldName: 'SPARKY_FITNESS_DB_USER', newName: 'BLOOM_DB_USER' },
  { oldName: 'SPARKY_FITNESS_DB_PASSWORD', newName: 'BLOOM_DB_PASSWORD' },
  { oldName: 'SPARKY_FITNESS_APP_DB_USER', newName: 'BLOOM_APP_DB_USER' },
  { oldName: 'SPARKY_FITNESS_APP_DB_PASSWORD', newName: 'BLOOM_APP_DB_PASSWORD' },
  { oldName: 'SPARKY_FITNESS_FRONTEND_URL', newName: 'BLOOM_FRONTEND_URL' },
  { oldName: 'SPARKY_FITNESS_SERVER_PORT', newName: 'BLOOM_SERVER_PORT', defaultValue: '3010' },
  { oldName: 'SPARKY_FITNESS_API_ENCRYPTION_KEY', newName: 'BLOOM_API_ENCRYPTION_KEY' },
  { oldName: 'SPARKY_FITNESS_LOG_LEVEL', newName: 'BLOOM_LOG_LEVEL', defaultValue: 'info' },
  { oldName: 'SPARKY_FITNESS_DISABLE_SIGNUP', newName: 'BLOOM_DISABLE_SIGNUP' },
  { oldName: 'SPARKY_FITNESS_DISABLE_EMAIL_LOGIN', newName: 'BLOOM_DISABLE_EMAIL_LOGIN' },
  { oldName: 'SPARKY_FITNESS_EXTRA_TRUSTED_ORIGINS', newName: 'BLOOM_EXTRA_TRUSTED_ORIGINS' },
  { oldName: 'SPARKY_FITNESS_CUSTOM_UPLOADS_DIRECTORY', newName: 'BLOOM_CUSTOM_UPLOADS_DIRECTORY' },
  { oldName: 'SPARKY_FITNESS_ADMIN_EMAIL', newName: 'BLOOM_ADMIN_EMAIL' },
  { oldName: 'SPARKY_FITNESS_API_KEY_RATELIMIT_WINDOW_MS', newName: 'BLOOM_API_KEY_RATELIMIT_WINDOW_MS' },
  { oldName: 'SPARKY_FITNESS_API_KEY_RATELIMIT_MAX_REQUESTS', newName: 'BLOOM_API_KEY_RATELIMIT_MAX_REQUESTS' },
  { oldName: 'SPARKY_FITNESS_OIDC_ISSUER_URL', newName: 'BLOOM_OIDC_ISSUER_URL' },
  { oldName: 'SPARKY_FITNESS_PUBLIC_API_DOCS', newName: 'BLOOM_PUBLIC_API_DOCS' },
  { oldName: 'BETTER_AUTH_SECRET', newName: 'BETTER_AUTH_SECRET' },
  { oldName: 'BETTER_AUTH_URL', newName: 'BETTER_AUTH_URL' },
  { oldName: 'ALLOW_PRIVATE_NETWORK_CORS', newName: 'ALLOW_PRIVATE_NETWORK_CORS' },
  { oldName: 'OLLAMA_BASE_URL', newName: 'OLLAMA_BASE_URL', defaultValue: 'http://192.168.0.245:11434' },
  { oldName: 'OLLAMA_EMBEDDING_MODEL', newName: 'OLLAMA_EMBEDDING_MODEL', defaultValue: 'nomic-embed-text' },
  { oldName: 'OLLAMA_EMBEDDING_DIMENSION', newName: 'OLLAMA_EMBEDDING_DIMENSION', defaultValue: '768' },
] as const;
