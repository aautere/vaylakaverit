import { describe, expect, it } from 'vitest';
import { apiUrl } from './api-url';

describe('apiUrl', () => {
  it('keeps relative API paths for the local Vite proxy', () => {
    expect(apiUrl('/api/health', undefined)).toBe('/api/health');
  });

  it('uses the configured Function App origin for deployed API paths', () => {
    expect(
      apiUrl(
        '/api/preview/completed-rounds',
        'https://vaylakaverit-development-api.azurewebsites.net',
      ),
    ).toBe('https://vaylakaverit-development-api.azurewebsites.net/api/preview/completed-rounds');
  });

  it('rejects API origins that could expose requests outside HTTPS', () => {
    expect(() => apiUrl('/api/health', 'http://example.test')).toThrow(
      'VITE_API_ORIGIN must be an HTTPS origin without a path or credentials.',
    );
    expect(() => apiUrl('/api/health', 'https://example.test/api')).toThrow(
      'VITE_API_ORIGIN must be an HTTPS origin without a path or credentials.',
    );
  });
});
