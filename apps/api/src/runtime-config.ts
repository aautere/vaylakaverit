export type RuntimeMode = 'local-preview' | 'shared-development' | 'production';

const runtimeModes: readonly RuntimeMode[] = ['local-preview', 'shared-development', 'production'];

export function readRuntimeMode(environment: NodeJS.ProcessEnv = process.env): RuntimeMode {
  const runtimeMode = environment.APP_RUNTIME ?? 'local-preview';

  if (!runtimeModes.includes(runtimeMode as RuntimeMode)) {
    throw new Error('APP_RUNTIME must be "local-preview", "shared-development", or "production".');
  }

  return runtimeMode as RuntimeMode;
}
