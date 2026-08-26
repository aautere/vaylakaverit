import { describe, expect, it } from 'vitest';
import { readRuntimeMode } from './runtime-config.js';

describe('runtime configuration', () => {
  it('defaults to local preview', () => {
    expect(readRuntimeMode({})).toBe('local-preview');
  });

  it('accepts the explicit shared development and production modes', () => {
    expect(readRuntimeMode({ APP_RUNTIME: 'shared-development' })).toBe('shared-development');
    expect(readRuntimeMode({ APP_RUNTIME: 'production' })).toBe('production');
  });

  it('rejects unknown runtime modes', () => {
    expect(() => readRuntimeMode({ APP_RUNTIME: 'staging' })).toThrow(
      'APP_RUNTIME must be "local-preview", "shared-development", or "production".',
    );
  });
});
