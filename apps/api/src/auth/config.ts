export type AuthConfig = {
  kind: 'guest';
};

export function readAuthConfig(environment: NodeJS.ProcessEnv = process.env): AuthConfig {
  const kind = environment.AUTH_MODE ?? 'guest';
  if (kind !== 'guest') {
    throw new Error('AUTH_MODE must be "guest".');
  }

  return { kind };
}
