import { describe, it, expect } from 'vitest';
import { isSavedPage } from './page-utils';

describe('isSavedPage()', () => {
  it('rejects common non-saved routes', () => {
    expect(isSavedPage('/')).toBe(false);
    expect(isSavedPage('/explore')).toBe(false);
    expect(isSavedPage('/reels/')).toBe(false);
    expect(isSavedPage('/p/123456789')).toBe(false);
    expect(isSavedPage('')).toBe(false);
  });

  it('accepts the saved folder with and without a trailing slash', () => {
    expect(isSavedPage('/saved')).toBe(true);
    expect(isSavedPage('/saved/')).toBe(true);
  });

  it('accepts the default saved location for all IG layouts', () => {
    expect(isSavedPage('/reels/saved/')).toBe(true);
    expect(isSavedPage('/reels/saved')).toBe(true);
    expect(isSavedPage('/reels/USERNAME/saved/')).toBe(true);
    expect(isSavedPage('/reels/USERNAME/saved')).toBe(true);
    expect(isSavedPage('/u/USERNAME/saved/')).toBe(true);
    expect(isSavedPage('/u/USERNAME/saved')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isSavedPage('/Saved/')).toBe(true);
    expect(isSavedPage('/SAVED')).toBe(true);
  });
});
