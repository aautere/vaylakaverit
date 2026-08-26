import { readRuntimeMode } from '../runtime-config.js';

export type GuestAuthConfig = {
  kind: 'guest';
};

export type AppleAuthConfig = {
  kind: 'apple';
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
  sessionSecret: string;
};

export type AuthConfig = GuestAuthConfig | AppleAuthConfig;

export function readAuthConfig(environment: NodeJS.ProcessEnv = process.env): AuthConfig {
  const runtimeMode = readRuntimeMode(environment);

  if (runtimeMode !== 'production') {
    if (environment.AUTH_MODE && environment.AUTH_MODE !== 'guest') {
      throw new Error(`AUTH_MODE must be "guest" when APP_RUNTIME is "${runtimeMode}".`);
    }

    return { kind: 'guest' };
  }

  if (environment.AUTH_MODE && environment.AUTH_MODE !== 'apple') {
    throw new Error('AUTH_MODE must be "apple" when APP_RUNTIME is "production".');
  }

  const clientId = requiredSetting(environment, 'APPLE_CLIENT_ID');
  const teamId = requiredIdentifier(environment, 'APPLE_TEAM_ID');
  const keyId = requiredIdentifier(environment, 'APPLE_KEY_ID');
  const privateKey = requiredSetting(environment, 'APPLE_PRIVATE_KEY');
  const sessionSecret = requiredSetting(environment, 'SESSION_JWT_SECRET');

  if (sessionSecret.length < 32) {
    throw new Error('SESSION_JWT_SECRET must contain at least 32 characters.');
  }

  return { kind: 'apple', clientId, teamId, keyId, privateKey, sessionSecret };
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
