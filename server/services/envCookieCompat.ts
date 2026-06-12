/*
 * Env/Cookie Compatibility Config
 *
 * Resolves environment variables and cookie names during the SparkyFitness -> Bloom/T1D transition.
 *
 * Strategy:
 * - New BLOOM_/T1D_ env vars take precedence over old SPARKY_FITNESS_ vars.
 * - Old SPARKY_FITNESS_ vars remain supported as fallbacks during transition.
 * - DB role rename is explicitly deferred (not handled here).
 * - During cookie transition, both old (sparky) and new (bloom) cookie names are
 *   recognized for reading; sign-out clears both prefixes.
 */

const ENV_ALIASES: Array<{ newKey: string; oldKey: string }> = [
  { newKey: 'BLOOM_FRONTEND_URL', oldKey: 'SPARKY_FITNESS_FRONTEND_URL' },
  { newKey: 'BLOOM_API_ENCRYPTION_KEY', oldKey: 'SPARKY_FITNESS_API_ENCRYPTION_KEY' },
  { newKey: 'BLOOM_DB_HOST', oldKey: 'SPARKY_FITNESS_DB_HOST' },
  { newKey: 'BLOOM_DB_PORT', oldKey: 'SPARKY_FITNESS_DB_PORT' },
  { newKey: 'BLOOM_DB_NAME', oldKey: 'SPARKY_FITNESS_DB_NAME' },
  { newKey: 'BLOOM_DB_USER', oldKey: 'SPARKY_FITNESS_DB_USER' },
  { newKey: 'BLOOM_DB_PASSWORD', oldKey: 'SPARKY_FITNESS_DB_PASSWORD' },
  { newKey: 'BLOOM_APP_DB_USER', oldKey: 'SPARKY_FITNESS_APP_DB_USER' },
  { newKey: 'BLOOM_APP_DB_PASSWORD', oldKey: 'SPARKY_FITNESS_APP_DB_PASSWORD' },
  { newKey: 'BLOOM_SERVER_HOST', oldKey: 'SPARKY_FITNESS_SERVER_HOST' },
  { newKey: 'BLOOM_SERVER_PORT', oldKey: 'SPARKY_FITNESS_SERVER_PORT' },
  { newKey: 'BLOOM_DISABLE_EMAIL_LOGIN', oldKey: 'SPARKY_FITNESS_DISABLE_EMAIL_LOGIN' },
  { newKey: 'BLOOM_DISABLE_SIGNUP', oldKey: 'SPARKY_FITNESS_DISABLE_SIGNUP' },
  { newKey: 'BLOOM_PUBLIC_API_DOCS', oldKey: 'SPARKY_FITNESS_PUBLIC_API_DOCS' },
  { newKey: 'BLOOM_LOG_LEVEL', oldKey: 'SPARKY_FITNESS_LOG_LEVEL' },
  { newKey: 'BLOOM_EXTRA_TRUSTED_ORIGINS', oldKey: 'SPARKY_FITNESS_EXTRA_TRUSTED_ORIGINS' },
  { newKey: 'BLOOM_COOKIE_PREFIX', oldKey: 'BLOOM_COOKIE_PREFIX' },
  { newKey: 'T1D_OLLAMA_BASE_URL', oldKey: 'OLLAMA_BASE_URL' },
  { newKey: 'T1D_OLLAMA_EMBEDDING_MODEL', oldKey: 'OLLAMA_EMBEDDING_MODEL' },
  { newKey: 'T1D_OLLAMA_EMBEDDING_DIMENSION', oldKey: 'OLLAMA_EMBEDDING_DIMENSION' },
];

/**
 * Resolve an env var preferring the new name, falling back to the old alias.
 */
export function resolveEnvWithAlias(
  newKey: string,
  oldKey: string
): string | undefined {
  const newValue = process.env[newKey];
  if (newValue !== undefined && newValue !== '') {
    return newValue;
  }
  const oldValue = process.env[oldKey];
  if (oldValue !== undefined && oldValue !== '') {
    return oldValue;
  }
  return undefined;
}

/*
 * Load the full env compatibility configuration.
 * New BLOOM_/T1D_ vars take precedence; old SPARKY_FITNESS_ vars are fallbacks.
 */
export function getEnvCompatConfig(): {
  frontendUrl: string | undefined;
  apiEncryptionKey: string | undefined;
  dbHost: string | undefined;
  dbPort: string | undefined;
  dbName: string | undefined;
  dbUser: string | undefined;
  dbPassword: string | undefined;
  appDbUser: string | undefined;
  appDbPassword: string | undefined;
  serverHost: string | undefined;
  serverPort: string | undefined;
  disableEmailLogin: string | undefined;
  disableSignup: string | undefined;
  publicApiDocs: string | undefined;
  logLevel: string | undefined;
  extraTrustedOrigins: string | undefined;
  cookiePrefix: string;
  ollamaBaseUrl: string | undefined;
  ollamaEmbeddingModel: string | undefined;
  ollamaEmbeddingDimension: string | undefined;
} {
  return {
    frontendUrl: resolveEnvWithAlias('BLOOM_FRONTEND_URL', 'SPARKY_FITNESS_FRONTEND_URL'),
    apiEncryptionKey: resolveEnvWithAlias('BLOOM_API_ENCRYPTION_KEY', 'SPARKY_FITNESS_API_ENCRYPTION_KEY'),
    dbHost: resolveEnvWithAlias('BLOOM_DB_HOST', 'SPARKY_FITNESS_DB_HOST'),
    dbPort: resolveEnvWithAlias('BLOOM_DB_PORT', 'SPARKY_FITNESS_DB_PORT'),
    dbName: resolveEnvWithAlias('BLOOM_DB_NAME', 'SPARKY_FITNESS_DB_NAME'),
    dbUser: resolveEnvWithAlias('BLOOM_DB_USER', 'SPARKY_FITNESS_DB_USER'),
    dbPassword: resolveEnvWithAlias('BLOOM_DB_PASSWORD', 'SPARKY_FITNESS_DB_PASSWORD'),
    appDbUser: resolveEnvWithAlias('BLOOM_APP_DB_USER', 'SPARKY_FITNESS_APP_DB_USER'),
    appDbPassword: resolveEnvWithAlias('BLOOM_APP_DB_PASSWORD', 'SPARKY_FITNESS_APP_DB_PASSWORD'),
    serverHost: resolveEnvWithAlias('BLOOM_SERVER_HOST', 'SPARKY_FITNESS_SERVER_HOST'),
    serverPort: resolveEnvWithAlias('BLOOM_SERVER_PORT', 'SPARKY_FITNESS_SERVER_PORT'),
    disableEmailLogin: resolveEnvWithAlias('BLOOM_DISABLE_EMAIL_LOGIN', 'SPARKY_FITNESS_DISABLE_EMAIL_LOGIN'),
    disableSignup: resolveEnvWithAlias('BLOOM_DISABLE_SIGNUP', 'SPARKY_FITNESS_DISABLE_SIGNUP'),
    publicApiDocs: resolveEnvWithAlias('BLOOM_PUBLIC_API_DOCS', 'SPARKY_FITNESS_PUBLIC_API_DOCS'),
    logLevel: resolveEnvWithAlias('BLOOM_LOG_LEVEL', 'SPARKY_FITNESS_LOG_LEVEL'),
    extraTrustedOrigins: resolveEnvWithAlias('BLOOM_EXTRA_TRUSTED_ORIGINS', 'SPARKY_FITNESS_EXTRA_TRUSTED_ORIGINS'),
    cookiePrefix: process.env.BLOOM_COOKIE_PREFIX || process.env.SPARKY_FITNESS_COOKIE_PREFIX || 'sparky',
    ollamaBaseUrl: resolveEnvWithAlias('T1D_OLLAMA_BASE_URL', 'OLLAMA_BASE_URL'),
    ollamaEmbeddingModel: resolveEnvWithAlias('T1D_OLLAMA_EMBEDDING_MODEL', 'OLLAMA_EMBEDDING_MODEL'),
    ollamaEmbeddingDimension: resolveEnvWithAlias('T1D_OLLAMA_EMBEDDING_DIMENSION', 'OLLAMA_EMBEDDING_DIMENSION'),
  };
}

/**
 * Return the list of cookie name prefixes that should be cleaned up on sign-out.
 * Includes both old (sparky) and new (bloom) prefixes during transition.
 */
export function getCookieNamesForSignOut(
  oldPrefix: string | undefined,
  newPrefix: string
): string[] {
  const cookies: string[] = [];

  if (oldPrefix) {
    cookies.push(`${oldPrefix}.session_token`);
    cookies.push(`${oldPrefix}_active_user_id`);
  }

  cookies.push(`${newPrefix}.session_token`);
  cookies.push(`${newPrefix}_active_user_id`);

  return cookies;
}

export const ENV_ALIAS_REGISTRY = ENV_ALIASES;
