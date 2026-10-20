// fetch() with timeout, retries and exponential backoff + jitter.
// Retries on network errors, timeouts, 408, 409, 425, 429 and 5xx. Honours
// Retry-After (seconds or HTTP date). Never logs request headers or bodies.

export class HttpError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, body?: string, retryable?: boolean }} [info]
   */
  constructor(message, info = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = info.status;
    this.body = info.body;
    this.retryable = info.retryable ?? false;
  }
}

const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function retryAfterMs(res) {
  const h = res.headers.get('retry-after');
  if (!h) return null;
  const secs = Number(h);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const at = Date.parse(h);
  return Number.isFinite(at) ? Math.max(0, at - Date.now()) : null;
}

/** Strip anything that looks like a key from an error body before logging. */
export function scrubSecrets(s) {
  return String(s ?? '')
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '<redacted>')
    .replace(/sk[-_][0-9A-Za-z_-]{16,}/g, '<redacted>')
    .replace(/((?:api[_-]?key|token|authorization|bearer)["']?\s*[:=]\s*["']?)[A-Za-z0-9._~+/-]{16,}/gi, '$1<redacted>');
}

/** Pull a one-line human message out of a provider's JSON error body. */
function summariseBody(body) {
  try {
    const j = JSON.parse(body);
    const e = Array.isArray(j) ? j[0]?.error ?? j[0] : j.error ?? j.detail ?? j;
    const msg = e?.message ?? (typeof e === 'string' ? e : null);
    const code = e?.status ?? e?.code ?? e?.type;
    if (msg) return `${code ? `${code}: ` : ''}${msg}`;
  } catch {}
  return body.replace(/\s+/g, ' ').trim().slice(0, 500);
}

/** Errors that will fail every request in the run (bad key, no quota, no access). */
function isFatal(status, body) {
  return status === 401 || status === 403 || /API_KEY_INVALID|invalid_api_key|quota_exceeded|PERMISSION_DENIED/.test(body);
}

/**
 * @param {string} url
 * @param {RequestInit} init
 * @param {{ label?: string, retries?: number, baseDelayMs?: number, maxDelayMs?: number, timeoutMs?: number, log?: (msg: string) => void }} [opts]
 * @returns {Promise<Response>} a 2xx response
 */
export async function fetchWithRetry(url, init, opts = {}) {
  const {
    label = 'request',
    retries = 5,
    baseDelayMs = 2000,
    maxDelayMs = 60_000,
    timeoutMs = 180_000,
    log = (m) => console.warn(m),
  } = opts;

  let attempt = 0;
  for (;;) {
    attempt++;
    let res;
    let err;
    try {
      res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (e) {
      err = e;
    }

    if (res && res.ok) return res;

    let retryable;
    let waitHint = null;
    let message;
    if (res) {
      const body = scrubSecrets(await res.text().catch(() => ''));
      retryable = RETRYABLE_STATUS.has(res.status);
      waitHint = retryAfterMs(res);
      message = `${label} failed: HTTP ${res.status} ${summariseBody(body)}`;
      const fatal = isFatal(res.status, body);
      if (fatal || !retryable || attempt > retries) {
        const e = new HttpError(message, { status: res.status, body, retryable });
        e.fatal = fatal;
        throw e;
      }
    } else {
      const name = err?.name ?? 'Error';
      retryable = true;
      message = `${label} failed: ${name === 'TimeoutError' ? `timed out after ${timeoutMs / 1000}s` : scrubSecrets(err?.message ?? String(err))}`;
      if (attempt > retries) throw new HttpError(message, { retryable: true });
    }

    const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
    const jitter = Math.random() * backoff * 0.25;
    const wait = Math.min(maxDelayMs, Math.max(waitHint ?? 0, backoff + jitter));
    log(`  ! ${message.split('\n')[0].slice(0, 300)}`);
    log(`  ! retry ${attempt}/${retries} in ${(wait / 1000).toFixed(1)}s`);
    await sleep(wait);
  }
}

/**
 * Run `fn` again (with backoff) when it throws an error marked `retryable`.
 * Used for "model returned no image" style soft failures that are not HTTP errors.
 */
export async function withSoftRetry(fn, { attempts = 2, delayMs = 3000, log = (m) => console.warn(m), label = 'step' } = {}) {
  for (let i = 1; ; i++) {
    try {
      return await fn(i);
    } catch (e) {
      if (!e?.softRetry || i >= attempts) throw e;
      log(`  ! ${label}: ${e.message} (attempt ${i}/${attempts}, retrying)`);
      await sleep(delayMs * i);
    }
  }
}
