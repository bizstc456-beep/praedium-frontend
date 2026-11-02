import i18n from '../i18n';

const DEFAULT_TIMEOUT_MS = 20000;

// Thrown by apiRequest for every failure case (network, timeout, non-JSON
// response, or a clean 4xx/5xx from the API) so every call site can catch
// one error type and show err.message directly -- it's always either the
// backend's own message or a friendly, translated fallback, never a raw
// browser/parsing error like "Failed to fetch" or "Unexpected token '<'".
export class ApiError extends Error {
  constructor(message, { status, code, data } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

// Drop-in replacement for `fetch(url, options).then(r => r.json())`, used
// across the app, with three things plain fetch doesn't give us:
//  - a timeout, so a hung or slow backend can't leave the UI stuck on a
//    loading spinner forever with no feedback
//  - a friendly, translated message on a true network failure (offline,
//    DNS, CORS) instead of the browser's raw "Failed to fetch"
//  - a friendly, translated message when the response isn't valid JSON --
//    a gateway timeout or crash page from Vercel/Railway, for example --
//    instead of a raw JSON-parsing error
// On a clean API error response (4xx/5xx with a JSON body), the backend's
// own data.error message is kept as-is, since those are already written
// for people to read. The parsed body is always returned/attached so
// callers that need extra fields (an error code, structured details) still
// have them -- this only replaces the unfriendly failure paths, not the
// data itself.
export async function apiRequest(url, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, { ...fetchOptions, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(i18n.t('errors.timeout'));
    }
    throw new ApiError(i18n.t('errors.network'));
  } finally {
    clearTimeout(timeoutId);
  }

  let text;
  try {
    text = await res.text();
  } catch {
    throw new ApiError(i18n.t('errors.network'));
  }

  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new ApiError(i18n.t('errors.badResponse'), { status: res.status });
    }
  }

  if (!res.ok) {
    throw new ApiError((data && data.error) || i18n.t('errors.generic'), {
      status: res.status,
      code: data && data.code,
      data,
    });
  }

  return data;
}
