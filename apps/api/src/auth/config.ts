export type PreviewAuthConfig = {
  kind: 'preview';
};

export type AppleAuthConfig = {
  kind: 'apple';
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
  sessionSecret: string;
};

export type AuthConfig = PreviewAuthConfig | AppleAuthConfig;

export function readAuthConfig(environment: NodeJS.ProcessEnv = process.env): AuthConfig {
  const kind =
    environment.AUTH_MODE ?? (environment.ROUND_STORE === 'cosmos' ? 'apple' : 'preview');

  if (kind === 'preview') {
    if (environment.ROUND_STORE === 'cosmos') {
      throw new Error('AUTH_MODE "preview" is only available with ROUND_STORE "preview".');
    }

    return { kind };
  }

  if (kind !== 'apple') {
    throw new Error('AUTH_MODE must be either "preview" or "apple".');
  }

  const clientId = requiredSetting(environment, 'APPLE_CLIENT_ID');
  const teamId = requiredIdentifier(environment, 'APPLE_TEAM_ID');
  const keyId = requiredIdentifier(environment, 'APPLE_KEY_ID');
  const privateKey = requiredSetting(environment, 'APPLE_PRIVATE_KEY');
  const sessionSecret = requiredSetting(environment, 'SESSION_JWT_SECRET');

  if (sessionSecret.length < 32) {
    throw new Error('SESSION_JWT_SECRET must contain at least 32 characters.');
  }

  return { kind, clientId, teamId, keyId, privateKey, sessionSecret };
}

function requiredSetting(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required when AUTH_MODE is "apple".`);
  }

  return value;
}

function requiredIdentifier(environment: NodeJS.ProcessEnv, name: string): string {
  const value = requiredSetting(environment, name);

  if (!/^[A-Za-z0-9]{10}$/.test(value)) {
    throw new Error(`${name} must be a 10-character Apple identifier.`);
  }

  return value;
}
