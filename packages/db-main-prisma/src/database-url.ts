export type IDatabaseTarget = 'meta' | 'data';

const metaDatabaseEnvKeys = ['PRISMA_META_DATABASE_URL', 'PRISMA_DATABASE_URL', 'DATABASE_URL'];
const dataDatabaseEnvKeys = [
  'PRISMA_DATA_DATABASE_URL',
  'PRISMA_META_DATABASE_URL',
  'PRISMA_DATABASE_URL',
  'DATABASE_URL',
];

/**
 * Append Prisma pool params from env when the URL doesn't already set them:
 * - PRISMA_CONNECTION_LIMIT → connection_limit (Prisma default: num_cpus * 2 + 1)
 * - PRISMA_POOL_TIMEOUT → pool_timeout in seconds (Prisma default: 10)
 */
const applyPoolParams = (url: string, env: NodeJS.ProcessEnv): string => {
  if (!url.startsWith('postgres')) {
    return url;
  }
  const params: Array<[string, string | undefined]> = [
    ['connection_limit', env.PRISMA_CONNECTION_LIMIT],
    ['pool_timeout', env.PRISMA_POOL_TIMEOUT],
  ];
  let result = url;
  for (const [name, value] of params) {
    if (value && !result.includes(`${name}=`)) {
      result += `${result.includes('?') ? '&' : '?'}${name}=${encodeURIComponent(value)}`;
    }
  }
  return result;
};

export const getDatabaseUrl = (
  target: IDatabaseTarget,
  env: NodeJS.ProcessEnv = process.env
): string => {
  const keys = target === 'data' ? dataDatabaseEnvKeys : metaDatabaseEnvKeys;
  for (const key of keys) {
    const value = env[key];
    if (value) {
      return applyPoolParams(value, env);
    }
  }

  throw new Error(`Missing ${target} database url (${keys.join(', ')})`);
};
