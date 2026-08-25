const apiOrigin = import.meta.env.VITE_API_ORIGIN;

export function apiUrl(path: string, configuredOrigin = apiOrigin): string {
  if (!configuredOrigin) {
    return path;
  }

  const origin = new URL(configuredOrigin);
  if (
    origin.protocol !== 'https:' ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash ||
    origin.username ||
    origin.password
  ) {
    throw new Error('VITE_API_ORIGIN must be an HTTPS origin without a path or credentials.');
  }

  return new URL(path, origin.origin).toString();
}
