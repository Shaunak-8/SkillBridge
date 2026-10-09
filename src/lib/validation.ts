import { ApiFailure } from './api';
export function uuid(value: string) {
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value)) throw new ApiFailure(400, 'INVALID_INPUT', 'Invalid identifier.');
  return value;
}
export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > 20000) throw new ApiFailure(413, 'PAYLOAD_TOO_LARGE', 'Request is too large.');
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new ApiFailure(400, 'INVALID_INPUT', 'Invalid JSON object.'); }
}
export function textField(value: unknown, max = 5000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new ApiFailure(400, 'INVALID_INPUT', `Enter text between 1 and ${max} characters.`);
  return value.trim();
}
export function textList(value: unknown) {
  if (!Array.isArray(value) || value.length > 50) throw new ApiFailure(400, 'INVALID_INPUT', 'Enter a list of up to 50 items.');
  return value.map(item => textField(item, 300));
}
