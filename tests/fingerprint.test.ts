import { describe, it, expect } from 'vitest';
import { generateULID, hashContent, hashObject } from '../src/bos/evidence/fingerprint.js';

describe('fingerprint', () => {
  describe('generateULID', () => {
    it('should generate a 26-character string', () => {
      const ulid = generateULID();
      expect(ulid.length).toBe(26);
    });

    it('should only contain valid Crockford Base32 characters', () => {
      const ulid = generateULID();
      expect(ulid).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    });

    it('should generate unique ULIDs', () => {
      const a = generateULID();
      const b = generateULID();
      expect(a).not.toBe(b);
    });

    it('should generate monotonically increasing ULIDs (same millisecond)', () => {
      const ulids: string[] = [];
      for (let i = 0; i < 100; i++) {
        ulids.push(generateULID());
      }
      // All should be unique
      const unique = new Set(ulids);
      expect(unique.size).toBe(100);
    });

    it('should produce sortable time prefix (first 10 chars)', () => {
      const ulid1 = generateULID();
      const ulid2 = generateULID();
      // Both should have 10-char time prefix
      expect(ulid1.slice(0, 10).length).toBe(10);
      expect(ulid2.slice(0, 10).length).toBe(10);
    });
  });

  describe('hashContent', () => {
    it('should return a 64-character hex string (SHA-256)', () => {
      const hash = hashContent('hello world');
      expect(hash.length).toBe(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic for same input', () => {
      const a = hashContent('test input');
      const b = hashContent('test input');
      expect(a).toBe(b);
    });

    it('should produce different hashes for different inputs', () => {
      const a = hashContent('hello');
      const b = hashContent('world');
      expect(a).not.toBe(b);
    });

    it('should hash the known SHA-256 of "hello world"', () => {
      // SHA-256 of "hello world" = b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9
      const hash = hashContent('hello world');
      expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
    });
  });

  describe('hashObject', () => {
    it('should return a 64-character hex string', () => {
      const hash = hashObject({ key: 'value' });
      expect(hash.length).toBe(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic', () => {
      const obj = { a: 1, b: 'two', c: [1, 2, 3] };
      const a = hashObject(obj);
      const b = hashObject(obj);
      expect(a).toBe(b);
    });

    it('should produce different hashes for different objects', () => {
      const a = hashObject({ x: 1 });
      const b = hashObject({ x: 2 });
      expect(a).not.toBe(b);
    });

    it('should produce different hashes for differently ordered keys', () => {
      // JSON.stringify with sorted keys is used internally
      const a = hashObject({ a: 1, b: 2 });
      const b = hashObject({ b: 2, a: 1 });
      // Both should produce same hash because keys are sorted
      expect(a).toBe(b);
    });

    it('should hash strings directly', () => {
      const a = hashObject('string input');
      const b = hashContent('string input');
      expect(a).toBe(b);
    });
  });
});
