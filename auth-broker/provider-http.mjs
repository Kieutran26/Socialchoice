export async function boundedJson(response, limit) {
  if (!response.body) throw new Error('Missing body');
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new Error('Body too large');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}


export async function providerJson(url, token, fields, fetcher = fetch, form = true) {
  const response = await fetcher(url, { method: fields ? "POST" : "GET", redirect: "manual", signal: AbortSignal.timeout(20000), headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(fields ? { "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json; charset=utf-8" } : {}) }, ...(fields ? { body: form ? new URLSearchParams(fields) : JSON.stringify(fields) } : {}) });
  if (response.status >= 300 && response.status < 400) { await response.body?.cancel(); throw new Error('Unexpected provider redirect'); }
  const value = await boundedJson(response, 256 * 1024);
  if (!response.ok || !value || typeof value !== "object" || Array.isArray(value) || value.error && value.error?.code !== 'ok') throw Object.assign(new Error("Invalid provider verification"), { invalidGrant: ['invalid_token','invalid_access_token','access_token_invalid','scope_not_authorized',190,10,200].includes(typeof value?.error === 'string' ? value.error : value?.error?.code) });
  return value;
}
