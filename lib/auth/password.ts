const ITERATIONS = 210000;
const KEY_LENGTH = 32;
const encoder = new TextEncoder();

function bytesToBase64(bytes: Uint8Array) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function base64ToBytes(value: string) {
  const s = atob(value);
  return Uint8Array.from(s, c => c.charCodeAt(0));
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'}, key, KEY_LENGTH*8);
  return `pbkdf2-sha256$${ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`;
}
export async function verifyPassword(password:string, encoded:string) {
  const [scheme, iterations, salt64, hash64] = encoded.split('$');
  if (scheme !== 'pbkdf2-sha256') return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2',salt:base64ToBytes(salt64),iterations:Number(iterations),hash:'SHA-256'}, key, KEY_LENGTH*8);
  const actual = new Uint8Array(bits), expected = base64ToBytes(hash64);
  if (actual.length !== expected.length) return false;
  let diff = 0; for (let i=0;i<actual.length;i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
