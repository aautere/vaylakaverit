import { describe, expect, it } from 'vitest';
import { readAuthConfig } from './config.js';

describe('guest authentication configuration', () => {
  it('uses guest sessions without provider credentials in every environment', () => {
    expect(readAuthConfig({})).toEqual({ kind: 'guest' });
    expect(readAuthConfig({ ROUND_STORE: 'cosmos' })).toEqual({ kind: 'guest' });
  });

  it('rejects removed provider authentication modes', () => {
    expect(() => readAuthConfig({ AUTH_MODE: 'apple' })).toThrow('AUTH_MODE must be "guest".');
    expect(() => readAuthConfig({ AUTH_MODE: 'preview' })).toThrow('AUTH_MODE must be "guest".');
  });
});
