import { createHash, randomBytes } from 'crypto';

const BASE32_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function generateULID(): string {
  const timeBytes = Buffer.alloc(10);
  let now = Date.now();
  for (let i = 9; i >= 0; i--) {
    timeBytes[i] = now & 0xff;
    now >>>= 8;
  }

  const timePart = encodeBase32(timeBytes).slice(0, 10);

  const randomness = randomBytes(16);
  const randPart = encodeBase32(randomness).slice(0, 16);

  return timePart + randPart;
}

function encodeBase32(buffer: Buffer): string {
  let result = '';
  let bits = 0;
  let value = 0;

  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    if (byte === undefined) continue;
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return result;
}

export function hashContent(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

export function hashObject(obj: unknown): string {
  const serialized = typeof obj === 'string' ? obj : JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort());
  return hashContent(serialized);
}
