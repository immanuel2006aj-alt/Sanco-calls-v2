export function generateCallId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return Array.from(array, byte => chars[byte % chars.length]).join('');
}

export function validateCallId(id) {
  if (!id || typeof id !== 'string') return false;
  const cleaned = id.trim().toUpperCase();
  return /^[A-Z0-9]{8}$/.test(cleaned);
}

export function normalizeCallId(id) {
  return id.trim().toUpperCase();
}
