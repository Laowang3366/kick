import { describe, expect, it } from 'vitest';
import { readSharedTextFromUrl } from './sharedText';

describe('readSharedTextFromUrl', () => {
  it('returns shared text and url from mobile share-target query params', () => {
    expect(readSharedTextFromUrl('https://app.example/?text=Hello%20world&url=https%3A%2F%2Fexample.com')).toBe(
      'Hello world\nhttps://example.com'
    );
  });

  it('returns an empty string when no share-target text exists', () => {
    expect(readSharedTextFromUrl('https://app.example/')).toBe('');
  });
});
